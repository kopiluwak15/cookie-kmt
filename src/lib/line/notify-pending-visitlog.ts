/**
 * 全員退勤時に施術ログ未入力のチェックイン顧客があればスタッフ全員にLINE通知
 *
 * 呼び出し元:
 *   1. タイムカード退勤処理後（LIFF / Web両方）
 *   2. 安全策としてcron（閉店後）
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { pushMessage } from '@/lib/line/client'

function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * 全員退勤済みかチェックし、施術ログ未入力の顧客がいればスタッフ全員にLINE通知。
 * - 同日に既に送信済みならスキップ（重複防止）
 * - 戻り値: { sent: true } or { skipped: reason }
 */
export async function notifyPendingVisitLogIfAllOut(): Promise<
  { sent: true; pendingCount: number } | { skipped: string }
> {
  const supabase = createAdminClient()
  const today = todayJst()

  // ---- 1. 同日に既に送信済みかチェック ----
  const { data: existing } = await supabase
    .from('staff_notification_log')
    .select('id')
    .eq('notification_type', 'pending_visitlog')
    .eq('date', today)
    .maybeSingle()

  if (existing) {
    return { skipped: 'already_sent_today' }
  }

  // ---- 2. 本日出勤したスタッフのうち、まだ退勤していないスタッフがいるか ----
  const { data: attendance } = await supabase
    .from('attendance')
    .select('staff_id, checkin_time, checkout_time')
    .eq('date', today)
    .not('checkin_time', 'is', null)

  if (!attendance || attendance.length === 0) {
    return { skipped: 'no_attendance_today' }
  }

  const stillWorking = attendance.filter((a) => !a.checkout_time)
  if (stillWorking.length > 0) {
    return { skipped: `${stillWorking.length}_staff_still_working` }
  }

  // ---- 3. 施術ログ未入力のチェックイン顧客を取得 ----
  // last_visit_date = 今日 の顧客のうち、visit_history が無い人
  const { data: checkedInCustomers } = await supabase
    .from('customer')
    .select('id, customer_code, name')
    .eq('last_visit_date', today)
    .order('customer_code', { ascending: true })

  if (!checkedInCustomers || checkedInCustomers.length === 0) {
    return { skipped: 'no_checkedin_customers' }
  }

  // visit_history がある顧客を除外
  const customerIds = checkedInCustomers.map((c) => c.id)
  const { data: visited } = await supabase
    .from('visit_history')
    .select('customer_id')
    .eq('visit_date', today)
    .in('customer_id', customerIds)

  const visitedSet = new Set((visited || []).map((v) => v.customer_id as string))
  const pending = checkedInCustomers.filter((c) => !visitedSet.has(c.id))

  if (pending.length === 0) {
    return { skipped: 'all_visitlogs_entered' }
  }

  // ---- 4. メッセージ組み立て ----
  const separator = 'ーーーーーーーーーーーーーーーーーーー'
  const lines = pending.map((c) => {
    const code = c.customer_code || '---'
    return `${code}　${c.name}様の施術ログが入力されていません。`
  })

  const messageText =
    `【施術ログ未入力のお知らせ】\n` +
    `${separator}\n` +
    lines.join('\n') +
    `\n\n担当は入力をお願いします。\n` +
    separator

  // ---- 5. アクティブスタッフ全員（LINE登録済み）に送信 ----
  const { data: staffList } = await supabase
    .from('staff')
    .select('id, name, line_user_id')
    .eq('is_active', true)
    .not('line_user_id', 'is', null)

  if (!staffList || staffList.length === 0) {
    return { skipped: 'no_line_registered_staff' }
  }

  let sentCount = 0
  let failedCount = 0
  const detail: Record<string, string> = {}

  for (const s of staffList) {
    try {
      await pushMessage(s.line_user_id!, [{ type: 'text', text: messageText }])
      detail[s.id] = 'sent'
      sentCount++
    } catch (e) {
      const err = e as Error
      detail[s.id] = `failed: ${err.message?.slice(0, 200)}`
      failedCount++
      console.error(`[notify-pending-visitlog] failed to send to ${s.name}:`, err.message)
    }
  }

  // ---- 6. ログ記録 ----
  await supabase.from('staff_notification_log').insert({
    notification_type: 'pending_visitlog',
    date: today,
    message: messageText,
    target_staff_ids: staffList.map((s) => s.id),
    sent_count: sentCount,
    failed_count: failedCount,
    detail: {
      ...detail,
      pending_customers: pending.map((c) => ({
        id: c.id,
        code: c.customer_code,
        name: c.name,
      })),
    },
  })

  return { sent: true, pendingCount: pending.length }
}
