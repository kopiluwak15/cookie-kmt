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

// ============================================
// カルテタブ用: 今日チェックイン済み顧客のカルテ＋お悩みアンケート
// ============================================

export interface KarteIntakeRow {
  id: string
  customer_id: string
  visit_route: string | null
  todays_wish: string[]
  history: string[]
  worries: string[]
  worries_other: string | null
  reasons: string[]
  reasons_other: string | null
  stay_style: string | null
  stay_style_other: string | null
  dislikes: string[]
  dislikes_other: string | null
  spots: string[]
  selected_menus_text: string | null
  is_concept_session: boolean
  created_at: string
}

export interface ConceptIntakeRow {
  id: string
  customer_id: string
  symptoms: string[]
  symptoms_other: string | null
  life_impacts: string[]
  life_other: string | null
  psychology: string[]
  past_experiences: string[]
  success_criteria: string[]
  success_free: string | null
  priorities: string[]
  worries_free: string | null
  created_at: string
}

export interface CheckedInCustomerWithKarte {
  id: string
  name: string
  customer_code: string | null
  karte: KarteIntakeRow | null
  concept: ConceptIntakeRow | null
}

export async function getCheckedInCustomersWithKarte(): Promise<CheckedInCustomerWithKarte[]> {
  const staff = await getCachedStaffInfo()
  if (!staff) return []

  const admin = createAdminClient()
  const today = todayJst()

  // 本日チェックイン済み顧客
  const { data: customers } = await admin
    .from('customer')
    .select('id, name, customer_code')
    .eq('last_visit_date', today)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (!customers || customers.length === 0) return []

  const ids = customers.map((c) => c.id)

  // karte_intake: 各顧客の最新1件（today）
  const { data: kartes } = await admin
    .from('karte_intake')
    .select('*')
    .in('customer_id', ids)
    .gte('created_at', `${today}T00:00:00+09:00`)
    .order('created_at', { ascending: false })

  // concept_intake: 各顧客の最新1件（today）
  const { data: concepts } = await admin
    .from('concept_intake')
    .select('*')
    .in('customer_id', ids)
    .gte('created_at', `${today}T00:00:00+09:00`)
    .order('created_at', { ascending: false })

  // customer_id → 最新1件をマップ
  const karteMap = new Map<string, KarteIntakeRow>()
  for (const k of (kartes || []) as KarteIntakeRow[]) {
    if (!karteMap.has(k.customer_id)) karteMap.set(k.customer_id, k)
  }
  const conceptMap = new Map<string, ConceptIntakeRow>()
  for (const c of (concepts || []) as ConceptIntakeRow[]) {
    if (!conceptMap.has(c.customer_id)) conceptMap.set(c.customer_id, c)
  }

  return customers
    .filter((c) => karteMap.has(c.id) || conceptMap.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      customer_code: c.customer_code,
      karte: karteMap.get(c.id) || null,
      concept: conceptMap.get(c.id) || null,
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
