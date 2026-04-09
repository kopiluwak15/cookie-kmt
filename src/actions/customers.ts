'use server'

import { createClient } from '@/lib/supabase/server'
import { getCachedStaffInfo } from '@/lib/cached-auth'

export async function searchCustomers(query: string) {
  const supabase = await createClient()

  if (!query || query.length < 1) return []

  const { data, error } = await supabase
    .from('customer')
    .select('id, customer_code, name, name_kana, phone, last_visit_date, line_user_id')
    .or(`name.ilike.%${query}%,name_kana.ilike.%${query}%,customer_code.ilike.%${query}%,phone.ilike.%${query}%`)
    .order('last_visit_date', { ascending: false, nullsFirst: false })
    .limit(10)

  if (error) throw new Error(error.message)
  return data
}

export async function getRecentCustomers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customer')
    .select('id, customer_code, name, name_kana, phone, last_visit_date, line_user_id')
    .order('last_visit_date', { ascending: false, nullsFirst: false })
    .limit(20)

  if (error) throw new Error(error.message)
  return data
}

export async function deleteCustomer(id: string) {
  // オーナー権限チェック
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }
  const isOwner = !!(staff as unknown as Record<string, unknown>).is_owner
  if (!isOwner) return { error: 'この操作はオーナーのみ実行できます' }

  const supabase = await createClient()

  // 関連する施術履歴を先に削除
  await supabase
    .from('visit_history')
    .delete()
    .eq('customer_id', id)

  // 関連するLINE送信履歴を削除
  await supabase
    .from('line_message_history')
    .delete()
    .eq('customer_id', id)

  // 顧客を削除
  const { error } = await supabase
    .from('customer')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `顧客の削除に失敗しました: ${error.message}` }
  }

  return { success: true }
}

export async function updateCustomer(
  id: string,
  data: {
    name: string
    name_kana?: string | null
    phone?: string | null
    birth_month?: number | null
    visit_motivation?: string | null
    individual_cycle_days?: number | null
    notes?: string | null
    first_visit_date?: string | null
    last_visit_date?: string | null
  }
) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const supabase = await createClient()

  // birth_month → birthday (date型) に変換。月のみ保存（日は1日固定）
  const birthday = data.birth_month
    ? `2000-${String(data.birth_month).padStart(2, '0')}-01`
    : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    name: data.name,
    name_kana: data.name_kana || null,
    phone: data.phone || null,
    birthday,
    visit_motivation: data.visit_motivation || null,
    individual_cycle_days: data.individual_cycle_days || null,
    notes: data.notes || null,
    updated_at: new Date().toISOString(),
  }

  if (data.first_visit_date !== undefined) {
    updateData.first_visit_date = data.first_visit_date || null
  }
  if (data.last_visit_date !== undefined) {
    updateData.last_visit_date = data.last_visit_date || null
  }

  const { error } = await supabase
    .from('customer')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return { error: `顧客情報の更新に失敗しました: ${error.message}` }
  }

  return { success: true }
}

// 本日チェックイン済み＋施術ログ未入力の顧客を取得
export async function getTodayCheckedInCustomers() {
  const supabase = await createClient()

  // 日本時間の今日の日付を取得
  const now = new Date()
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const today = jstDate.toISOString().split('T')[0]

  // 今日来店日として登録されている施術ログの顧客IDリスト
  const { data: todayVisits } = await supabase
    .from('visit_history')
    .select('customer_id')
    .eq('visit_date', today)

  const loggedCustomerIds = new Set((todayVisits || []).map(v => v.customer_id))

  // 本日チェックイン済みの顧客（first_visit_dateかlast_visit_dateが今日 = QRチェックイン済み）
  const { data: customers, error } = await supabase
    .from('customer')
    .select('id, customer_code, name, name_kana, phone, last_visit_date, line_user_id')
    .or(`first_visit_date.eq.${today},last_visit_date.eq.${today}`)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  // 施術ログ入力済みの顧客を除外
  return (customers || []).filter(c => !loggedCustomerIds.has(c.id))
}

export async function createCustomer(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const nameKana = formData.get('name_kana') as string | null
  const phone = formData.get('phone') as string | null

  const { data, error } = await supabase
    .from('customer')
    .insert({
      name,
      name_kana: nameKana || null,
      phone: phone || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// 手動カルテ生成（LINE未登録顧客用）
export async function createManualCustomer(data: {
  name: string
  phone?: string | null
  visit_motivation?: string | null
}) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const supabase = await createClient()

  // 日本時間の今日
  const now = new Date()
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const today = jstDate.toISOString().split('T')[0]

  const { data: customer, error } = await supabase
    .from('customer')
    .insert({
      name: data.name,
      phone: data.phone || null,
      visit_motivation: data.visit_motivation || null,
      first_visit_date: today,
      last_visit_date: today,
      total_visits: 0,
      line_user_id: null,
      line_blocked: false,
    })
    .select('id, customer_code, name')
    .single()

  if (error) {
    return { error: `顧客の作成に失敗しました: ${error.message}` }
  }

  return { success: true, customer }
}
