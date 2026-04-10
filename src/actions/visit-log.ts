'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedStaffInfo } from '@/lib/cached-auth'
import { sendThankYouLine } from '@/lib/line/send'
import { createCaseRecord } from '@/actions/case-records'

export async function createVisitLog(formData: FormData) {
  const supabase = await createClient()

  const customerId = formData.get('customer_id') as string
  const serviceMenu = formData.get('service_menu') as string
  const styleCategoryId = formData.get('style_category_id') as string | null
  const staffName = formData.get('staff_name') as string
  const checkinAt = formData.get('checkin_at') as string | null
  const checkoutAt = formData.get('checkout_at') as string | null
  const priceStr = formData.get('price') as string | null
  const expectedDurationStr = formData.get('expected_duration_minutes') as string | null
  const notes = formData.get('notes') as string | null

  // 症例データ（任意）
  const concernTagsRaw = formData.get('concern_tags') as string | null
  const treatmentTagsRaw = formData.get('treatment_tags') as string | null
  const concernRaw = formData.get('concern_raw') as string | null
  const treatmentRaw = formData.get('treatment_raw') as string | null
  const chemicalNotes = formData.get('chemical_notes') as string | null
  const counselingNotes = formData.get('counseling_notes') as string | null
  const treatmentFindings = formData.get('treatment_findings') as string | null
  const nextProposal = formData.get('next_proposal') as string | null
  const hasConceptMenu = formData.get('has_concept_menu') === '1'
  const concernTags = concernTagsRaw
    ? concernTagsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const treatmentTags = treatmentTagsRaw
    ? treatmentTagsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  // バリデーション: service_menu, style_category_id 必須
  if (!customerId || !serviceMenu || !styleCategoryId || !staffName) {
    return { error: '必須項目を入力してください' }
  }

  // 重複チェック: 同一顧客・同日の施術ログが既にある場合はエラー
  const today = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: existingLog } = await supabase
    .from('visit_history')
    .select('id')
    .eq('customer_id', customerId)
    .eq('visit_date', today)
    .limit(1)
    .single()

  if (existingLog) {
    return { error: 'この顧客の本日の施術ログは既に入力されています' }
  }

  // 有効な来店周期を取得（スタイル選択時のみ）
  let visitCycleDays = 28
  if (styleCategoryId) {
    const adminClient = createAdminClient()
    const { data: cycleData } = await adminClient
      .rpc('get_effective_cycle', {
        p_customer_id: customerId,
        p_style_id: styleCategoryId,
      })
    visitCycleDays = cycleData || 28
  }

  // 施術ログを挿入
  const insertData: Record<string, unknown> = {
    customer_id: customerId,
    service_menu: serviceMenu,
    staff_name: staffName,
    visit_cycle_days: visitCycleDays,
  }
  if (styleCategoryId) insertData.style_category_id = styleCategoryId
  if (checkinAt) insertData.checkin_at = checkinAt
  if (checkoutAt) insertData.checkout_at = checkoutAt
  if (priceStr) insertData.price = parseInt(priceStr, 10)
  if (expectedDurationStr) insertData.expected_duration_minutes = parseInt(expectedDurationStr, 10)
  if (notes && notes.trim()) insertData.notes = notes.trim()
  if (chemicalNotes && chemicalNotes.trim()) insertData.chemical_notes = chemicalNotes.trim()

  let visit
  const { data, error } = await supabase
    .from('visit_history')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    // expected_duration_minutes カラム未追加の場合、そのカラムを除いてリトライ
    if (error.message.includes('expected_duration_minutes')) {
      delete insertData.expected_duration_minutes
      const { data: retryData, error: retryError } = await supabase
        .from('visit_history')
        .insert(insertData)
        .select()
        .single()
      if (retryError) {
        return { error: `施術ログの保存に失敗しました: ${retryError.message}` }
      }
      visit = retryData
    } else {
      return { error: `施術ログの保存に失敗しました: ${error.message}` }
    }
  } else {
    visit = data
  }

  // サンキューLINE送信 (非同期で実行、エラーはログのみ)
  try {
    await sendThankYouLine(customerId, visit.id, styleCategoryId, visitCycleDays, hasConceptMenu)
  } catch (e) {
    console.error('サンキューLINE送信エラー:', e)
  }

  // 症例レコード作成 + AI要約（任意、空なら何もしない）
  try {
    await createCaseRecord({
      visit_history_id: visit.id,
      customer_id: customerId,
      concern_tags: concernTags,
      concern_raw: concernRaw,
      treatment_tags: treatmentTags,
      treatment_raw: treatmentRaw,
      counseling_notes: counselingNotes,
      treatment_findings: treatmentFindings,
      next_proposal: nextProposal,
    })
  } catch (e) {
    console.error('症例レコード作成エラー:', e)
  }

  return { success: true, visitId: visit.id }
}

export async function getStyles() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('style_settings')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (error) throw new Error(error.message)
  return data
}

export async function getActiveServiceMenus() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('service_menus')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  // テーブル未作成の場合はデフォルトメニューを返す
  if (error) {
    console.warn('service_menus テーブル未作成の可能性があります:', error.message)
    return [
      { id: 'default-1', name: 'カット', category: 'カット', estimated_minutes: 30, default_price: null, display_order: 1, is_active: true, is_concept: false, created_at: '' },
      { id: 'default-2', name: 'ブラックカラー', category: 'カラー', estimated_minutes: 30, default_price: null, display_order: 2, is_active: true, is_concept: false, created_at: '' },
      { id: 'default-3', name: '髭脱毛', category: 'オプション', estimated_minutes: 15, default_price: null, display_order: 3, is_active: true, is_concept: false, created_at: '' },
      { id: 'default-4', name: '眉カット', category: '部分カット', estimated_minutes: 5, default_price: null, display_order: 4, is_active: true, is_concept: false, created_at: '' },
      { id: 'default-5', name: 'ヘッドスパ', category: 'ヘッドスパ', estimated_minutes: 10, default_price: null, display_order: 5, is_active: true, is_concept: false, created_at: '' },
    ]
  }
  return data
}

// 施術ログの編集（オーナーのみ）
export async function updateVisitLog(
  id: string,
  data: {
    customer_id: string
    service_menu: string
    style_category_id?: string | null
    staff_name: string
    checkin_at?: string | null
    checkout_at?: string | null
    price?: number | null
    expected_duration_minutes?: number | null
  }
) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }
  const isOwner = !!(staff as unknown as Record<string, unknown>).is_owner
  if (!isOwner) return { error: 'この操作はオーナーのみ実行できます' }

  const supabase = await createClient()

  // 有効な来店周期を取得
  let visitCycleDays = 28
  if (data.style_category_id) {
    const adminClient = createAdminClient()
    const { data: cycleData } = await adminClient
      .rpc('get_effective_cycle', {
        p_customer_id: data.customer_id,
        p_style_id: data.style_category_id,
      })
    visitCycleDays = cycleData || 28
  }

  const updateData: Record<string, unknown> = {
    customer_id: data.customer_id,
    service_menu: data.service_menu,
    staff_name: data.staff_name,
    visit_cycle_days: visitCycleDays,
  }
  if (data.style_category_id) updateData.style_category_id = data.style_category_id
  if (data.checkin_at) updateData.checkin_at = data.checkin_at
  if (data.checkout_at) updateData.checkout_at = data.checkout_at
  if (data.price != null) updateData.price = data.price
  if (data.expected_duration_minutes != null) updateData.expected_duration_minutes = data.expected_duration_minutes

  const { error } = await supabase
    .from('visit_history')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return { error: `施術ログの更新に失敗しました: ${error.message}` }
  }

  return { success: true }
}

// 施術ログの取得（編集用）
export async function getVisitRecord(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('visit_history')
    .select('*, customer(id, customer_code, name, name_kana, phone, line_user_id), style_settings(id, style_name)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

// 来店履歴の個別削除（オーナーのみ）
export async function deleteVisitRecord(id: string) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }
  const isOwner = !!(staff as unknown as Record<string, unknown>).is_owner
  if (!isOwner) return { error: 'この操作はオーナーのみ実行できます' }

  const supabase = await createClient()

  // 削除前に顧客IDを取得（total_visits更新用）
  const { data: visit } = await supabase
    .from('visit_history')
    .select('customer_id')
    .eq('id', id)
    .single()

  // 関連するLINEメッセージ履歴も削除
  await supabase
    .from('line_message_history')
    .delete()
    .eq('visit_history_id', id)

  const { error } = await supabase
    .from('visit_history')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `削除に失敗しました: ${error.message}` }
  }

  // 顧客のtotal_visitsを実際のvisit_history件数で再計算
  if (visit?.customer_id) {
    await recalcCustomerVisits(supabase, visit.customer_id)
  }

  return { success: true }
}

// 顧客の来店回数・最終来店日を実際のvisit_historyから再計算
async function recalcCustomerVisits(supabase: Awaited<ReturnType<typeof createClient>>, customerId: string) {
  const { data: visits } = await supabase
    .from('visit_history')
    .select('visit_date')
    .eq('customer_id', customerId)
    .order('visit_date', { ascending: false })

  const totalVisits = visits?.length || 0
  const lastVisitDate = visits?.[0]?.visit_date || null

  await supabase
    .from('customer')
    .update({
      total_visits: totalVisits,
      last_visit_date: lastVisitDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
}

export async function getStaffList() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('staff')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error(error.message)
  return data
}
