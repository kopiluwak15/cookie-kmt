import { createAdminClient } from '@/lib/supabase/admin'
import { pushMessage } from './client'
import { buildThankYouMessage } from './templates'
import { resolveBookingUrl } from './booking-url'

export async function sendThankYouLine(
  customerId: string,
  visitId: string,
  styleCategoryId: string | null,
  cycleDays: number,
  isConcept: boolean = false
) {
  const supabase = createAdminClient()

  // 顧客情報を取得（total_visits も取得して再来店判定に使用）
  const { data: customer } = await supabase
    .from('customer')
    .select('name, line_user_id, line_blocked, total_visits')
    .eq('id', customerId)
    .single()

  if (!customer?.line_user_id || customer.line_blocked) {
    return // LINE未登録またはブロック済み
  }

  // テンプレート種別の判定:
  //   - 2回目以降来店: thank_you_repeat（再サンキュー）
  //   - 初回 × コンセプトメニュー: thank_you_concept
  //   - 初回 × レギュラー: thank_you
  // ※ thank_you_repeat テンプレートが DB に無い場合は thank_you にフォールバック
  const totalVisits = customer.total_visits ?? 1
  const isRepeatVisit = totalVisits > 1
  let templateType: 'thank_you' | 'thank_you_concept' | 'thank_you_repeat'
  if (isRepeatVisit) {
    templateType = 'thank_you_repeat'
  } else if (isConcept) {
    templateType = 'thank_you_concept'
  } else {
    templateType = 'thank_you'
  }

  // スタイル名を取得（スタイル選択時のみ）
  let styleName = ''
  if (styleCategoryId) {
    const { data: style } = await supabase
      .from('style_settings')
      .select('style_name')
      .eq('id', styleCategoryId)
      .single()
    styleName = style?.style_name || ''
  }

  // スタイル未選択時はvisit_historyからservice_menuを取得
  if (!styleName) {
    const { data: visit } = await supabase
      .from('visit_history')
      .select('service_menu')
      .eq('id', visitId)
      .single()
    styleName = visit?.service_menu || ''
  }

  // 予約URLを取得（テンプレート別URL → 共通URLの順で解決）
  const bookingUrl = await resolveBookingUrl(supabase, templateType)

  // DBテンプレートを取得
  let { data: template } = await supabase
    .from('line_template_settings')
    .select('body_text, is_active')
    .eq('template_type', templateType)
    .maybeSingle()

  // thank_you_repeat が未登録なら thank_you にフォールバック（安全策）
  if (!template && templateType === 'thank_you_repeat') {
    const fb = await supabase
      .from('line_template_settings')
      .select('body_text, is_active')
      .eq('template_type', 'thank_you')
      .maybeSingle()
    template = fb.data
    templateType = 'thank_you'
  }

  // 次回目安来店日を算出（JST、X月Y日形式）
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const nextDate = new Date(jstNow)
  nextDate.setUTCDate(nextDate.getUTCDate() + cycleDays)
  const nextVisitDate = `${nextDate.getUTCMonth() + 1}月${nextDate.getUTCDate()}日`

  // Flex Message を構築（DBテンプレートがあればそちらを使用）
  const message = buildThankYouMessage({
    customerName: customer.name,
    styleName,
    cycleDays,
    nextVisitDate,
    bookingUrl,
    bodyText: template?.body_text || undefined,
  })

  try {
    const result = await pushMessage(customer.line_user_id, [message])

    // 送信履歴を保存
    await supabase.from('line_message_history').insert({
      customer_id: customerId,
      visit_history_id: visitId,
      message_type: templateType,
      line_request_id: result.requestId,
      status: 'sent',
    })

    // 施術ログの送信フラグを更新
    await supabase
      .from('visit_history')
      .update({ thank_you_sent: true })
      .eq('id', visitId)
  } catch (e) {
    const error = e as Error

    // ブロックされている場合
    if (error.message === 'LINE_BLOCKED') {
      await supabase
        .from('customer')
        .update({ line_blocked: true })
        .eq('id', customerId)

      await supabase.from('line_message_history').insert({
        customer_id: customerId,
        visit_history_id: visitId,
        message_type: templateType,
        status: 'blocked',
      })
      return
    }

    // その他のエラー
    await supabase.from('line_message_history').insert({
      customer_id: customerId,
      visit_history_id: visitId,
      message_type: templateType,
      status: 'failed',
      error_message: error.message,
    })

    throw error
  }
}
