'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getCachedStaffInfo } from '@/lib/cached-auth'

export interface AdminCheckedInCustomer {
  /** visit_history.id または customer.id (pending の場合) */
  id: string
  customer_id: string
  customer_code: string | null
  name: string
  /** 'pending'=チェックイン済み施術待ち, 'in_progress'=施術中, 'completed'=施術完了 */
  status: 'pending' | 'in_progress' | 'completed'
  /** 'visit' = visit_history レコード, 'checkin' = 顧客チェックインのみ */
  type: 'visit' | 'checkin'
  service_menu: string | null
  staff_name: string | null
  checkin_at: string | null
  checkout_at: string | null
  price: number | null
}

function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * 管理者用: 本日チェックイン済みの全顧客を取得。
 *
 * 1. visit_history (visit_date = 今日) → 施術ログあり
 *    - checkin_at あり & checkout_at なし → 施術中
 *    - checkin_at あり & checkout_at あり → 施術完了
 *    - checkin_at なし → 施術完了（時間未入力）
 * 2. customer (last_visit_date = 今日) で visit_history が無い → 施術待ち（チェックインのみ）
 */
export async function getAdminCheckedInCustomers(): Promise<AdminCheckedInCustomer[]> {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return []

  const admin = createAdminClient()
  const today = todayJst()

  // 1. 本日の visit_history を取得（顧客情報込み）
  const { data: visits } = await admin
    .from('visit_history')
    .select('id, customer_id, service_menu, staff_name, checkin_at, checkout_at, price, customer(customer_code, name)')
    .eq('visit_date', today)
    .order('checkin_at', { ascending: true })

  const visitList: AdminCheckedInCustomer[] = (visits || []).map((v) => {
    const cust = v.customer as unknown as { customer_code: string | null; name: string } | null
    let status: AdminCheckedInCustomer['status'] = 'completed'
    if (v.checkin_at && !v.checkout_at) {
      status = 'in_progress'
    }
    return {
      id: v.id,
      customer_id: v.customer_id,
      customer_code: cust?.customer_code ?? null,
      name: cust?.name ?? '不明',
      status,
      type: 'visit' as const,
      service_menu: v.service_menu,
      staff_name: v.staff_name,
      checkin_at: v.checkin_at,
      checkout_at: v.checkout_at,
      price: v.price,
    }
  })

  const visitedCustomerIds = new Set(visitList.map((v) => v.customer_id))

  // 2. 本日チェックイン済み（last_visit_date = 今日）で施術ログ未入力の顧客
  const { data: checkedInCustomers } = await admin
    .from('customer')
    .select('id, customer_code, name')
    .eq('last_visit_date', today)
    .order('updated_at', { ascending: false })

  const pendingList: AdminCheckedInCustomer[] = (checkedInCustomers || [])
    .filter((c) => !visitedCustomerIds.has(c.id))
    .map((c) => ({
      id: c.id,
      customer_id: c.id,
      customer_code: c.customer_code,
      name: c.name,
      status: 'pending' as const,
      type: 'checkin' as const,
      service_menu: null,
      staff_name: null,
      checkin_at: null,
      checkout_at: null,
      price: null,
    }))

  return [...pendingList, ...visitList]
}

/**
 * 管理者用: チェックイン記録を削除。
 * - type=visit の場合: visit_history レコード + 関連 LINE メッセージ履歴を削除
 * - type=checkin の場合: customer の last_visit_date をリセット
 */
export async function deleteCheckinRecord(id: string): Promise<{ success?: boolean; error?: string }> {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') {
    return { error: 'この操作は管理者のみ実行できます' }
  }

  const supabase = await createClient()
  const admin = createAdminClient()
  const today = todayJst()

  // まず visit_history で探す
  const { data: visit } = await supabase
    .from('visit_history')
    .select('id, customer_id')
    .eq('id', id)
    .single()

  if (visit) {
    // visit_history レコードの削除

    // 関連する LINE メッセージ履歴も削除
    await supabase
      .from('line_message_history')
      .delete()
      .eq('visit_history_id', id)

    // 関連する症例レコードも削除
    await admin
      .from('case_records')
      .delete()
      .eq('visit_history_id', id)

    const { error } = await supabase
      .from('visit_history')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: `削除に失敗しました: ${error.message}` }
    }

    // 顧客の total_visits / last_visit_date を再計算
    const { data: remaining } = await supabase
      .from('visit_history')
      .select('visit_date')
      .eq('customer_id', visit.customer_id)
      .order('visit_date', { ascending: false })

    const totalVisits = remaining?.length || 0
    const lastVisitDate = remaining?.[0]?.visit_date || null

    await supabase
      .from('customer')
      .update({
        total_visits: totalVisits,
        last_visit_date: lastVisitDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', visit.customer_id)

    return { success: true }
  }

  // visit_history に無い場合 = チェックインのみ（customer の last_visit_date をリセット）
  const { data: customer } = await admin
    .from('customer')
    .select('id, last_visit_date')
    .eq('id', id)
    .single()

  if (customer && customer.last_visit_date === today) {
    // 前回の来店日を取得
    const { data: prevVisit } = await admin
      .from('visit_history')
      .select('visit_date')
      .eq('customer_id', id)
      .order('visit_date', { ascending: false })
      .limit(1)
      .single()

    await admin
      .from('customer')
      .update({
        last_visit_date: prevVisit?.visit_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return { success: true }
  }

  return { error: '対象レコードが見つかりませんでした' }
}
