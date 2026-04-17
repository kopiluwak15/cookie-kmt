'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getCachedStaffInfo } from '@/lib/cached-auth'

export interface PendingVisitLogCustomer {
  customer_id: string
  customer_code: string | null
  name: string
  /** チェックインされた日 (YYYY-MM-DD, JST) */
  checkin_date: string
  /** チェックイン時刻の推定 (customer.updated_at) */
  checkin_at: string
}

function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * 前日までのチェックインだが施術ログ未入力の顧客一覧を取得。
 *
 * 条件:
 *   - customer.last_visit_date < 今日 (JST)
 *   - かつ visit_history に同日付のレコードが無い
 *
 * ソート: チェックイン時刻（updated_at）昇順＝早い人から表示
 */
export async function getPendingVisitLogCustomers(): Promise<PendingVisitLogCustomer[]> {
  const staff = await getCachedStaffInfo()
  if (!staff) return []

  const admin = createAdminClient()
  const today = todayJst()

  // 1. last_visit_date < 今日 の顧客を取得
  const { data: customers } = await admin
    .from('customer')
    .select('id, customer_code, name, last_visit_date, updated_at')
    .not('last_visit_date', 'is', null)
    .lt('last_visit_date', today)
    .order('last_visit_date', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(200)

  if (!customers || customers.length === 0) return []

  // 2. 当該顧客の visit_history を一括取得
  const customerIds = customers.map((c) => c.id)
  const { data: visits } = await admin
    .from('visit_history')
    .select('customer_id, visit_date')
    .in('customer_id', customerIds)

  // customer_id-visit_date の組み合わせSet
  const visitedKeys = new Set(
    (visits || []).map((v) => `${v.customer_id}__${v.visit_date}`)
  )

  // 3. last_visit_date に visit_history が無い顧客のみ抽出
  return customers
    .filter((c) => !visitedKeys.has(`${c.id}__${c.last_visit_date}`))
    .map((c) => ({
      customer_id: c.id,
      customer_code: c.customer_code,
      name: c.name,
      checkin_date: c.last_visit_date as string,
      checkin_at: c.updated_at as string,
    }))
}

/**
 * ログ未入力レコードを削除（= customer.last_visit_date を前回の実来店日にリセット）。
 *
 * 管理者のみ実行可。ゴーストチェックイン（お客様が自宅でLIFFを再起動して
 * 誤発火したケース等）を取り除くために使用する。
 *
 * ※ visit_history には触れない。customer.last_visit_date のみリセット。
 *   - 他の visit_history がある場合: 直近の visit_date に戻す
 *   - 他の visit_history が無い場合: NULL にする
 */
export async function deletePendingVisitLog(
  customerId: string
): Promise<{ success?: boolean; error?: string }> {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') {
    return { error: 'この操作は管理者のみ実行できます' }
  }

  const supabase = await createClient()
  const admin = createAdminClient()
  const today = todayJst()

  // 対象顧客の現在の last_visit_date を取得
  const { data: customer } = await supabase
    .from('customer')
    .select('id, last_visit_date')
    .eq('id', customerId)
    .single()

  if (!customer) {
    return { error: '対象の顧客が見つかりませんでした' }
  }

  // 安全チェック: 今日の日付ならこの機能で削除してはいけない（誤操作防止）
  if (customer.last_visit_date === today) {
    return {
      error:
        '本日のチェックインです。「チェックイン中」タブから削除してください。',
    }
  }

  // 前回の実来店日（visit_history.visit_date の最大値）を取得
  const { data: prevVisits } = await admin
    .from('visit_history')
    .select('visit_date')
    .eq('customer_id', customerId)
    .order('visit_date', { ascending: false })
    .limit(1)

  const previousVisitDate = prevVisits?.[0]?.visit_date || null

  // customer.last_visit_date を前回の実来店日に戻す
  const { error } = await admin
    .from('customer')
    .update({
      last_visit_date: previousVisitDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)

  if (error) {
    return { error: `削除に失敗しました: ${error.message}` }
  }

  return { success: true }
}
