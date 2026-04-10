'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedStaffInfo } from '@/lib/cached-auth'
import { pushMessage } from '@/lib/line/client'
import { signCounselingToken } from '@/lib/counseling/token'

/** 今日チェックイン済み（last_visit_date=本日）かつ、本日分の visit_history が未保存の顧客 */
export interface PendingCheckedInCustomer {
  id: string
  name: string
  customer_code: string | null
  line_user_id: string | null
  line_blocked: boolean
  last_visit_date: string | null
}

function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export async function getCheckedInPendingCustomers(): Promise<PendingCheckedInCustomer[]> {
  const staff = await getCachedStaffInfo()
  if (!staff) return []

  const admin = createAdminClient()
  const today = todayJst()

  // チェックイン済（= 本日 last_visit_date が更新された）顧客
  const { data: customers, error } = await admin
    .from('customer')
    .select('id, name, customer_code, line_user_id, line_blocked, last_visit_date')
    .eq('last_visit_date', today)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error || !customers) {
    console.error('[counseling] fetch customers failed', error)
    return []
  }

  if (customers.length === 0) return []

  // 本日 visit_history が既にある顧客 ID を取得 → 除外
  const ids = customers.map((c) => c.id)
  const { data: visited } = await admin
    .from('visit_history')
    .select('customer_id')
    .eq('visit_date', today)
    .in('customer_id', ids)

  const visitedSet = new Set((visited || []).map((v) => v.customer_id as string))

  return customers
    .filter((c) => !visitedSet.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      customer_code: c.customer_code,
      line_user_id: c.line_user_id,
      line_blocked: !!c.line_blocked,
      last_visit_date: c.last_visit_date,
    }))
}

/**
 * 指定顧客に「メニュー変更でカウンセリング再アンケート」LINE を送る
 */
export async function sendConceptResurveyLine(
  customerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const staff = await getCachedStaffInfo()
  if (!staff) return { ok: false, error: '権限がありません' }

  const admin = createAdminClient()
  const { data: customer } = await admin
    .from('customer')
    .select('id, name, line_user_id, line_blocked')
    .eq('id', customerId)
    .single()

  if (!customer) return { ok: false, error: '顧客が見つかりません' }
  if (!customer.line_user_id) return { ok: false, error: 'LINE 未登録の顧客です' }
  if (customer.line_blocked) return { ok: false, error: '公式LINEがブロックされています' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kmt.cookie.hair'
  const targetUrl = `${appUrl}/liff/welcome?mode=concept`

  const text =
    `${customer.name} 様\n\n` +
    `カウンセリングありがとうございました。\n` +
    `施術メニューが変更になりましたので、改めてお悩みアンケートのご回答をお願いいたします。\n\n` +
    `▼回答はこちらから\n${targetUrl}`

  try {
    const result = await pushMessage(customer.line_user_id, [{ type: 'text', text }])
    await admin.from('line_message_history').insert({
      customer_id: customer.id,
      message_type: 'thank_you', // TODO: counseling_resurvey 用の type を追加するなら別途
      line_request_id: result.requestId,
      status: 'sent',
    })
    return { ok: true }
  } catch (e) {
    const err = e as Error
    if (err.message === 'LINE_BLOCKED') {
      await admin
        .from('customer')
        .update({ line_blocked: true })
        .eq('id', customer.id)
      return { ok: false, error: '送信に失敗しました（ブロックされています）' }
    }
    console.error('[counseling] sendConceptResurveyLine failed', err)
    return { ok: false, error: `送信に失敗しました: ${err.message}` }
  }
}

/**
 * 指定顧客向けの一時 URL を発行（QR 用）
 */
export async function issueCounselingTokenUrl(
  customerId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const staff = await getCachedStaffInfo()
  if (!staff) return { ok: false, error: '権限がありません' }

  const admin = createAdminClient()
  const { data: customer } = await admin
    .from('customer')
    .select('id')
    .eq('id', customerId)
    .single()
  if (!customer) return { ok: false, error: '顧客が見つかりません' }

  const token = signCounselingToken(customerId)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kmt.cookie.hair'
  const url = `${appUrl}/counseling/fill?token=${encodeURIComponent(token)}`
  return { ok: true, url }
}
