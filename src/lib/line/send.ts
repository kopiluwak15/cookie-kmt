import { createAdminClient } from '@/lib/supabase/admin'
import { pushMessage } from './client'
import { buildThankYouMessage } from './templates'

export async function sendThankYouLine(
  customerId: string,
  visitId: string,
  styleCategoryId: string | null,
  cycleDays: number
) {
  const supabase = createAdminClient()

  // 顧客情報を取得
  const { data: customer } = await supabase
    .from('customer')
    .select('name, line_user_id, line_blocked')
    .eq('id', customerId)
    .single()

  if (!customer?.line_user_id || customer.line_blocked) {
    return // LINE未登録またはブロック済み
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

  // 予約URLを取得
  const { data: setting } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'booking_url')
    .single()

  const bookingUrl = setting?.value || ''

  // DBテンプレートを取得
  const { data: template } = await supabase
    .from('line_template_settings')
    .select('body_text, is_active')
    .eq('template_type', 'thank_you')
    .single()

  // Flex Message を構築（DBテンプレートがあればそちらを使用）
  const message = buildThankYouMessage({
    customerName: customer.name,
    styleName,
    cycleDays,
    bookingUrl,
    bodyText: template?.body_text || undefined,
  })

  try {
    const result = await pushMessage(customer.line_user_id, [message])

    // 送信履歴を保存
    await supabase.from('line_message_history').insert({
      customer_id: customerId,
      visit_history_id: visitId,
      message_type: 'thank_you',
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
        message_type: 'thank_you',
        status: 'blocked',
      })
      return
    }

    // その他のエラー
    await supabase.from('line_message_history').insert({
      customer_id: customerId,
      visit_history_id: visitId,
      message_type: 'thank_you',
      status: 'failed',
      error_message: error.message,
    })

    throw error
  }
}
