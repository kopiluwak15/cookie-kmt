'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedStaffInfo } from '@/lib/cached-auth'
import { DeliveryTiming } from '@/types'
import { notifyPendingVisitLogIfAllOut } from '@/lib/line/notify-pending-visitlog'

// ============================================
// JST日付ヘルパー
// ============================================

function getJSTToday(): string {
  const now = new Date()
  // UTC+9でJSTの日付を取得
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().split('T')[0]
}

function getCurrentUTCTimestamp(): string {
  return new Date().toISOString()
}

// ============================================
// GPS検証用：店舗位置情報取得
// ============================================

/**
 * スタッフが所属する店舗の位置情報を取得
 */
export async function getStoreLocation() {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const supabase = createAdminClient()

  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('store_id')
    .eq('id', staff.id)
    .single()

  if (staffError || !staffData?.store_id) {
    return { error: '店舗情報が取得できません' }
  }

  const { data: store, error: storeError } = await supabase
    .from('store')
    .select('latitude, longitude, gps_radius_meters, gps_enabled')
    .eq('id', staffData.store_id)
    .single()

  if (storeError) {
    return { error: '店舗位置情報の取得に失敗しました' }
  }

  return {
    success: true,
    location: {
      latitude: store.latitude as number | null,
      longitude: store.longitude as number | null,
      radiusMeters: (store.gps_radius_meters as number) || 50,
      gpsEnabled: (store.gps_enabled as boolean | null) !== false, // null/undefined → true
    },
  }
}

// ============================================
// GPS機能 ON/OFF 設定（管理者）
// ============================================

/**
 * 現在ログイン中の管理者の店舗のGPS機能ON/OFF状態を取得
 */
export async function getGpsEnabled() {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const supabase = createAdminClient()

  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('store_id')
    .eq('id', staff.id)
    .single()

  if (staffError || !staffData?.store_id) {
    return { error: '店舗情報が取得できません' }
  }

  const { data: store, error: storeError } = await supabase
    .from('store')
    .select('gps_enabled')
    .eq('id', staffData.store_id)
    .single()

  if (storeError) {
    return { error: 'GPS設定の取得に失敗しました' }
  }

  return {
    success: true,
    gpsEnabled: (store.gps_enabled as boolean | null) !== false,
  }
}

/**
 * GPS機能のON/OFFを切り替える（管理者のみ）
 */
export async function setGpsEnabled(enabled: boolean) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('store_id')
    .eq('id', staff.id)
    .single()

  if (staffError || !staffData?.store_id) {
    return { error: '店舗情報が取得できません' }
  }

  const { error: updateError } = await supabase
    .from('store')
    .update({ gps_enabled: enabled })
    .eq('id', staffData.store_id)

  if (updateError) {
    return { error: `GPS設定の更新に失敗しました: ${updateError.message}` }
  }

  return { success: true, gpsEnabled: enabled }
}

// ============================================
// スタッフ取得
// ============================================

/**
 * スタッフ一覧を取得（お知らせ配信用）
 */
export async function getStaffForAnnouncement() {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = await createClient()

  const { data: staffList, error } = await supabase
    .from('staff')
    .select('id, name, line_user_id, is_active')
    .eq('is_active', true)
    .neq('role', 'admin')
    .order('name', { ascending: true })

  if (error) {
    return { error: `スタッフ取得に失敗しました: ${error.message}` }
  }

  return { success: true, staff: staffList || [] }
}

// ============================================
// お知らせ配信
// ============================================

/**
 * お知らせを配信する
 */
export async function createAnnouncement(data: {
  title: string
  content: string
  importance: '重要' | '確認' | '指示' | 'お知らせ' | 'その他'
  delivery_timing: DeliveryTiming
  is_logged: boolean
  template_id?: string
  staff_ids: string[]
}) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const supabase = createAdminClient()

  // お知らせを作成
  const { data: announcement, error: announcementError } = await supabase
    .from('announcements')
    .insert({
      title: data.title,
      content: data.content,
      importance: data.importance,
      delivery_timing: data.delivery_timing,
      is_logged: data.is_logged,
      template_id: data.template_id || null,
      created_by: staff.id,
    })
    .select('id')
    .single()

  if (announcementError) {
    return { error: `お知らせ作成に失敗しました: ${announcementError.message}` }
  }

  // 配信対象を登録
  const recipients = data.staff_ids.map(staff_id => ({
    announcement_id: announcement.id,
    staff_id,
  }))

  const { error: recipientError } = await supabase
    .from('announcement_recipients')
    .insert(recipients)

  if (recipientError) {
    return { error: `配信対象の登録に失敗しました: ${recipientError.message}` }
  }

  return { success: true, announcement_id: announcement.id }
}

/**
 * 未読のお知らせを取得（配信タイミングでフィルタ）
 */
export async function getUnreadAnnouncements(timing: DeliveryTiming) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const supabase = createAdminClient()

  // このスタッフに配信されたお知らせを取得
  const { data: recipients, error: recipientError } = await supabase
    .from('announcement_recipients')
    .select('announcement_id, sent_at')
    .eq('staff_id', staff.id)
    .order('sent_at', { ascending: false })

  if (recipientError) {
    return { error: `お知らせ取得に失敗しました: ${recipientError.message}` }
  }

  if (!recipients || recipients.length === 0) {
    return { success: true, announcements: [] }
  }

  // 各お知らせの詳細を取得（配信タイミングでフィルタ）
  const announcementIds = recipients.map(r => r.announcement_id)

  const { data: announcements, error: announcementError } = await supabase
    .from('announcements')
    .select('*')
    .in('id', announcementIds)
    .eq('delivery_timing', timing)

  if (announcementError) {
    return { error: `お知らせ詳細取得に失敗しました: ${announcementError.message}` }
  }

  // 確認状況を取得
  const { data: reads, error: readError } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .eq('staff_id', staff.id)

  if (readError) {
    return { error: `確認状況取得に失敗しました: ${readError.message}` }
  }

  const readIds = new Set(reads?.map(r => r.announcement_id) || [])

  // 未読のお知らせのみを返す
  const unread = announcements
    ?.filter(a => !readIds.has(a.id))
    .sort((a, b) => {
      const importanceOrder: Record<string, number> = {
        '重要': 0, '確認': 1, '指示': 2, 'お知らせ': 3, 'その他': 4,
      }
      return (importanceOrder[a.importance] ?? 99) - (importanceOrder[b.importance] ?? 99)
    }) || []

  return { success: true, announcements: unread }
}

/**
 * スタッフがお知らせを確認
 */
export async function confirmAnnouncement(announcementId: string) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('announcement_reads')
    .insert({
      announcement_id: announcementId,
      staff_id: staff.id,
    })

  if (error && !error.message.includes('duplicate')) {
    return { error: `確認に失敗しました: ${error.message}` }
  }

  return { success: true }
}

// ============================================
// 出勤・退勤
// ============================================

/**
 * 本日の出退勤状態を取得（振り分け用）
 * RLSバイパスでadminClientを使用
 */
export async function getTodayAttendanceStatus() {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const supabase = createAdminClient()
  const today = getJSTToday()

  const { data: attendance, error } = await supabase
    .from('attendance')
    .select('checkin_time, checkout_time')
    .eq('staff_id', staff.id)
    .eq('date', today)
    .maybeSingle()

  if (error) {
    return { error: `出退勤状況確認エラー: ${error.message}` }
  }

  // 出勤済みで退勤していない → check_out
  if (attendance?.checkin_time && !attendance?.checkout_time) {
    return { success: true, status: 'checked_in' as const }
  }

  // 未出勤 or 既に退勤済み → check_in
  return { success: true, status: 'not_checked_in' as const }
}

/**
 * スタッフが出勤する
 * @param gpsVerified GPS機能ONで店舗範囲内を確認 → true / GPS機能OFF時 → null
 */
export async function checkIn(gpsVerified: boolean | null = null) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const supabase = createAdminClient()

  const today = getJSTToday()
  const currentTime = getCurrentUTCTimestamp()

  // 出勤記録を作成（既存の場合は更新）
  const { data: attendance, error } = await supabase
    .from('attendance')
    .upsert({
      staff_id: staff.id,
      date: today,
      checkin_time: currentTime,
      checkin_gps_verified: gpsVerified,
    })
    .select('id')
    .single()

  if (error) {
    return { error: `出勤記録に失敗しました: ${error.message}` }
  }

  return { success: true, checkin_time: currentTime }
}

/**
 * スタッフが退勤する（動的チェックリスト対応）
 * @param completedItemIds 完了したチェックリスト項目ID
 * @param gpsVerified GPS機能ONで店舗範囲内を確認 → true / GPS機能OFF時 → null
 */
export async function checkOut(completedItemIds: string[], gpsVerified: boolean | null = null) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const supabase = createAdminClient()

  const today = getJSTToday()
  const currentTime = getCurrentUTCTimestamp()

  // 退勤記録を更新
  const { error: attendanceError } = await supabase
    .from('attendance')
    .update({ checkout_time: currentTime, checkout_gps_verified: gpsVerified })
    .eq('staff_id', staff.id)
    .eq('date', today)

  if (attendanceError) {
    return { error: `退勤記録に失敗しました: ${attendanceError.message}` }
  }

  // チェックリストを記録（項目がある場合のみ、失敗しても退勤は成功）
  if (completedItemIds.length > 0) {
    try {
      await supabase
        .from('checkout_checklist')
        .upsert({
          staff_id: staff.id,
          date: today,
          completed_item_ids: completedItemIds,
          completed_at: currentTime,
        })
    } catch {
      // チェックリスト記録失敗は無視（退勤自体は成功させる）
    }
  }

  // 全員退勤したら施術ログ未入力通知を非同期で発火
  notifyPendingVisitLogIfAllOut().catch((e) =>
    console.error('[checkOut] notifyPendingVisitLog error:', e)
  )

  return { success: true, checkout_time: currentTime }
}

// ============================================
// タイムカード管理
// ============================================

/**
 * タイムカード取得（管理画面用）
 * チェックリスト担当スタッフの場合、完了日を含めて返す
 */
export async function getTimecard(
  staffId: string,
  year: number,
  month: number,
  options?: { fromDate?: string; toDate?: string }
) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  // 期間指定がある場合は優先、それ以外は year/month
  const startDate = options?.fromDate ?? `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = options?.toDate ?? new Date(year, month, 0).toISOString().split('T')[0]

  const { data: records, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('staff_id', staffId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    return { error: `タイムカード取得に失敗しました: ${error.message}` }
  }

  // チェックリスト担当スタッフか確認
  const { data: setting } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'checklist_assigned_staff_id')
    .maybeSingle()

  const isChecklistStaff = setting?.value === staffId
  let checklistDates: string[] = []

  if (isChecklistStaff) {
    // このスタッフのチェックリスト完了日を取得
    try {
      const { data: checklists } = await supabase
        .from('checkout_checklist')
        .select('date')
        .eq('staff_id', staffId)
        .gte('date', startDate)
        .lte('date', endDate)

      checklistDates = (checklists || []).map(c => c.date)
    } catch {
      // テーブルが存在しない場合も無視
    }
  }

  return {
    success: true,
    records: records || [],
    isChecklistStaff,
    checklistDates,
  }
}

/**
 * 直近N日間の全スタッフ出退勤を取得（管理者のみ）
 *   Section 2「直近7日間 全スタッフ ダッシュボード」用
 */
export async function getRecentAttendance(days = 7) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  // JST基準で「今日」と「N-1日前」を算出
  const now = new Date()
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const todayStr = jstNow.toISOString().split('T')[0]
  const fromDate = new Date(jstNow)
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1))
  const fromStr = fromDate.toISOString().split('T')[0]

  // 注: attendance には FK が無いので embed せず、staff 名はクライアント側の staffList で解決する
  // checkin_gps_verified / checkout_gps_verified は存在しない環境もあるので select('*') で吸収
  const { data: records, error } = await supabase
    .from('attendance')
    .select('*')
    .gte('date', fromStr)
    .lte('date', todayStr)
    .order('date', { ascending: false })

  if (error) {
    return { error: `直近タイムカード取得に失敗しました: ${error.message}` }
  }

  return {
    success: true,
    records: records || [],
    fromDate: fromStr,
    toDate: todayStr,
    days,
  }
}

/**
 * タイムカード修正（管理者のみ、マスターパスワード認証はフロントで実施）
 */
export async function updateAttendance(
  recordId: string,
  data: {
    checkin_time?: string | null
    checkout_time?: string | null
  }
) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('attendance')
    .update(data)
    .eq('id', recordId)

  if (error) {
    return { error: `タイムカード修正に失敗しました: ${error.message}` }
  }

  return { success: true }
}

/**
 * タイムカードレコード削除（管理者のみ、マスターパスワード認証はフロントで実施）
 */
export async function deleteAttendance(recordId: string) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', recordId)

  if (error) {
    return { error: `タイムカード削除に失敗しました: ${error.message}` }
  }

  return { success: true }
}

/**
 * 次回表示予定のお知らせ取得（未確認の受信者がいるもののみ）
 */
export async function getActiveAnnouncements(timing: DeliveryTiming) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  const { data: announcements, error } = await supabase
    .from('announcements')
    .select('*, announcement_recipients(staff_id), announcement_reads(staff_id)')
    .eq('delivery_timing', timing)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return { error: `お知らせ取得に失敗しました: ${error.message}` }
  }

  // スタッフ名を取得
  const staffIds = Array.from(
    new Set(
      (announcements || []).flatMap(a => {
        const recipients = (a as any).announcement_recipients || []
        return recipients.map((r: any) => r.staff_id)
      })
    )
  )

  let staffMap = new Map<string, string>()
  if (staffIds.length > 0) {
    const { data: staffData } = await supabase
      .from('staff')
      .select('id, name')
      .in('id', staffIds)

    staffMap = new Map(staffData?.map(s => [s.id, s.name]) || [])
  }

  const result = (announcements || [])
    .map(a => {
      const recipients = ((a as any).announcement_recipients || []) as { staff_id: string }[]
      const reads = ((a as any).announcement_reads || []) as { staff_id: string }[]
      const readStaffIds = new Set(reads.map(r => r.staff_id))

      return {
        id: a.id,
        title: a.title,
        content: a.content,
        importance: a.importance,
        created_at: a.created_at,
        recipientCount: recipients.length,
        confirmedCount: recipients.filter(r => readStaffIds.has(r.staff_id)).length,
        unconfirmedStaff: recipients
          .filter(r => !readStaffIds.has(r.staff_id))
          .map(r => staffMap.get(r.staff_id) || '不明'),
      }
    })
    // 未確認の受信者がいるもののみ返す
    .filter(a => a.confirmedCount < a.recipientCount)

  return { success: true, announcements: result }
}

// ============================================
// 配信ログ
// ============================================

/**
 * 配信ログ取得（管理画面用）
 */
export async function getAnnouncementLogs(staffId?: string) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = await createClient()

  let query = supabase
    .from('announcements')
    .select('*, announcement_recipients(staff_id), announcement_reads(staff_id, confirmed_at)')
    .eq('is_logged', true)
    .order('created_at', { ascending: false })

  const { data: announcements, error } = await query

  if (error) {
    return { error: `配信ログ取得に失敗しました: ${error.message}` }
  }

  let filtered = announcements || []
  if (staffId) {
    filtered = filtered.filter(a => {
      const recipients = (a as any).announcement_recipients || []
      return recipients.some((r: any) => r.staff_id === staffId)
    })
  }

  if (filtered.length > 0) {
    const staffIds = Array.from(
      new Set(
        filtered.flatMap(a => {
          const recipients = (a as any).announcement_recipients || []
          return recipients.map((r: any) => r.staff_id)
        })
      )
    )

    const { data: staffData } = await supabase
      .from('staff')
      .select('id, name')
      .in('id', staffIds)

    const staffMap = new Map(staffData?.map(s => [s.id, s.name]) || [])

    filtered = filtered.map(a => ({
      ...a,
      announcement_recipients: ((a as any).announcement_recipients || []).map((r: any) => ({
        ...r,
        staff_name: staffMap.get(r.staff_id) || r.staff_id,
      })),
    }))
  }

  return { success: true, announcements: filtered }
}

/**
 * お知らせを削除（管理者権限必須、マスターパスワード認証はフロントで実施）
 */
export async function deleteAnnouncement(announcementId: string) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId)

  if (error) {
    return { error: `削除に失敗しました: ${error.message}` }
  }

  return { success: true }
}

// ============================================
// 退勤チェックリスト項目管理
// ============================================

/**
 * チェックリスト担当スタッフIDを取得
 */
export async function getChecklistAssignedStaffId() {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'checklist_assigned_staff_id')
    .maybeSingle()

  if (error) {
    return { error: `設定取得に失敗しました: ${error.message}` }
  }

  return { success: true, staffId: data?.value || '' }
}

/**
 * チェックリスト担当スタッフIDを設定
 */
export async function setChecklistAssignedStaffId(staffId: string) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('global_settings')
    .upsert(
      { key: 'checklist_assigned_staff_id', value: staffId, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )

  if (error) {
    return { error: `担当スタッフ設定に失敗しました: ${error.message}` }
  }

  return { success: true }
}

/**
 * チェックリスト項目一覧を取得（管理画面用: 全件 / スタッフ用: 担当者のみ）
 */
export async function getChecklistItems(activeOnly = true) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const supabase = createAdminClient()

  let query = supabase
    .from('checkout_checklist_items')
    .select('*')
    .order('sort_order', { ascending: true })

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    return { error: `チェックリスト取得に失敗しました: ${error.message}` }
  }

  let items = data || []

  // スタッフの場合: global_settingsの担当者と一致する場合のみ表示
  if (staff.role !== 'admin') {
    const { data: setting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'checklist_assigned_staff_id')
      .maybeSingle()

    const assignedStaffId = setting?.value || ''
    if (assignedStaffId !== staff.id) {
      // このスタッフは担当ではない → 空リスト
      return { success: true, items: [] }
    }
  }

  return { success: true, items }
}

/**
 * チェックリスト項目を作成
 */
export async function createChecklistItem(data: {
  label: string
  description: string
}) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  // 現在の最大sort_orderを取得
  const { data: maxItem } = await supabase
    .from('checkout_checklist_items')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxItem?.sort_order ?? 0) + 1

  const { data: item, error } = await supabase
    .from('checkout_checklist_items')
    .insert({
      label: data.label,
      description: data.description,
      sort_order: nextOrder,
    })
    .select('id')
    .single()

  if (error) {
    return { error: `チェックリスト項目作成に失敗しました: ${error.message}` }
  }

  return { success: true, item_id: item.id }
}

/**
 * チェックリスト項目を更新
 */
export async function updateChecklistItem(
  itemId: string,
  data: { label?: string; description?: string; sort_order?: number }
) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('checkout_checklist_items')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', itemId)

  if (error) {
    return { error: `チェックリスト項目更新に失敗しました: ${error.message}` }
  }

  return { success: true }
}

/**
 * チェックリスト項目を削除（論理削除）
 */
export async function deleteChecklistItem(itemId: string) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('checkout_checklist_items')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', itemId)

  if (error) {
    return { error: `チェックリスト項目削除に失敗しました: ${error.message}` }
  }

  return { success: true }
}

/**
 * チェックリスト項目の並び順を更新
 */
export async function reorderChecklistItems(orderedIds: string[]) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('checkout_checklist_items')
      .update({ sort_order: i + 1 })
      .eq('id', orderedIds[i])

    if (error) {
      return { error: `並び替えに失敗しました: ${error.message}` }
    }
  }

  return { success: true }
}

// ============================================
// テンプレート管理
// ============================================

/**
 * テンプレート一覧を取得
 */
export async function getAnnouncementTemplates(timing?: DeliveryTiming) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = await createClient()

  let query = supabase
    .from('announcement_templates')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (timing) {
    query = query.eq('delivery_timing', timing)
  }

  const { data, error } = await query

  if (error) {
    return { error: `テンプレート取得に失敗しました: ${error.message}` }
  }

  return { success: true, templates: data || [] }
}

/**
 * テンプレートを作成
 */
export async function createAnnouncementTemplate(data: {
  title: string
  content: string
  delivery_timing: DeliveryTiming
}) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  const { data: template, error } = await supabase
    .from('announcement_templates')
    .insert({
      title: data.title,
      content: data.content,
      delivery_timing: data.delivery_timing,
    })
    .select('id')
    .single()

  if (error) {
    return { error: `テンプレート作成に失敗しました: ${error.message}` }
  }

  return { success: true, template_id: template.id }
}

/**
 * テンプレートを削除
 */
export async function deleteAnnouncementTemplate(templateId: string) {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') return { error: '管理者権限が必要です' }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('announcement_templates')
    .update({ is_active: false })
    .eq('id', templateId)

  if (error) {
    return { error: `テンプレート削除に失敗しました: ${error.message}` }
  }

  return { success: true }
}
