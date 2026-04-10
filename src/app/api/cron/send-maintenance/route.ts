import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { pushMessage } from '@/lib/line/client'
import { buildMaintenanceMessage } from '@/lib/line/templates'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * メンテナンスチケット自動配信
 *  - コンセプトメニュー受診者（line_message_history に thank_you_concept がある来店）に対して
 *  - 施術日からの経過日数が global_settings.maintenance_{N}_days_after に一致する日に送信
 *  - チケット有効期限 = 送信日 + maintenance_{N}_validity_days
 *  - 二重送信防止: line_message_history を SELECT で確認
 *  - 毎日 1 回（vercel.json の cron で実行）
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // 設定を取得
  const { data: settings } = await supabase
    .from('global_settings')
    .select('key, value')
    .in('key', [
      'booking_url',
      'maintenance_1_days_after',
      'maintenance_1_validity_days',
      'maintenance_2_days_after',
      'maintenance_2_validity_days',
    ])

  const settingMap = new Map((settings || []).map((s) => [s.key, s.value]))
  const bookingUrl = settingMap.get('booking_url') || ''
  const m1DaysAfter = parseInt(settingMap.get('maintenance_1_days_after') || '30', 10)
  const m1Validity = parseInt(settingMap.get('maintenance_1_validity_days') || '14', 10)
  const m2DaysAfter = parseInt(settingMap.get('maintenance_2_days_after') || '60', 10)
  const m2Validity = parseInt(settingMap.get('maintenance_2_validity_days') || '14', 10)

  // テンプレート取得
  const { data: templates } = await supabase
    .from('line_template_settings')
    .select('template_type, body_text, is_active')
    .in('template_type', ['maintenance_1', 'maintenance_2'])

  const m1Template = templates?.find((t) => t.template_type === 'maintenance_1')
  const m2Template = templates?.find((t) => t.template_type === 'maintenance_2')

  let m1Sent = 0
  let m2Sent = 0

  await runMaintenance({
    supabase,
    daysAfter: m1DaysAfter,
    validityDays: m1Validity,
    messageType: 'maintenance_1',
    templateActive: m1Template?.is_active !== false,
    bodyText: m1Template?.body_text || undefined,
    ticketLabel: 'メンテナンスチケット①',
    bookingUrl,
    onSent: () => { m1Sent++ },
  })

  await runMaintenance({
    supabase,
    daysAfter: m2DaysAfter,
    validityDays: m2Validity,
    messageType: 'maintenance_2',
    templateActive: m2Template?.is_active !== false,
    bodyText: m2Template?.body_text || undefined,
    ticketLabel: 'メンテナンスチケット②',
    bookingUrl,
    onSent: () => { m2Sent++ },
  })

  return NextResponse.json({
    maintenance_1_sent: m1Sent,
    maintenance_2_sent: m2Sent,
    timestamp: new Date().toISOString(),
  })
}

interface RunParams {
  supabase: ReturnType<typeof createAdminClient>
  daysAfter: number
  validityDays: number
  messageType: 'maintenance_1' | 'maintenance_2'
  templateActive: boolean
  bodyText?: string
  ticketLabel: string
  bookingUrl: string
  onSent: () => void
}

async function runMaintenance(params: RunParams) {
  if (!params.templateActive) return

  const { supabase, daysAfter, validityDays, messageType, bodyText, ticketLabel, bookingUrl } = params

  // JSTで「daysAfter日前」の日付を算出
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const targetDate = new Date(jstNow)
  targetDate.setUTCDate(targetDate.getUTCDate() - daysAfter)
  const targetDateStr = targetDate.toISOString().split('T')[0]

  // その日にコンセプトメニュー（thank_you_concept 履歴あり）を受けた来店を抽出
  const { data: candidates, error } = await supabase
    .from('visit_history')
    .select('id, customer_id, visit_date, customer:customer_id(name, line_user_id, line_blocked)')
    .eq('visit_date', targetDateStr)

  if (error) {
    console.error(`[${messageType}] visit fetch error:`, error.message)
    return
  }
  if (!candidates || candidates.length === 0) return

  // 各候補について thank_you_concept 履歴の有無＋既送信チェック
  for (const visit of candidates) {
    const customer = visit.customer as unknown as {
      name: string
      line_user_id: string | null
      line_blocked: boolean
    } | null
    if (!customer?.line_user_id || customer.line_blocked) continue

    // コンセプトメニュー受診（thank_you_concept 送信済み）の visit のみ対象
    const { data: history } = await supabase
      .from('line_message_history')
      .select('message_type')
      .eq('visit_history_id', visit.id)
      .in('message_type', ['thank_you_concept', messageType])

    const isConceptVisit = history?.some((h) => h.message_type === 'thank_you_concept')
    const alreadySent = history?.some((h) => h.message_type === messageType)
    if (!isConceptVisit || alreadySent) continue

    // 送信
    const validUntilDate = new Date(jstNow)
    validUntilDate.setUTCDate(validUntilDate.getUTCDate() + validityDays)
    const validUntilStr = `${validUntilDate.getUTCFullYear()}/${validUntilDate.getUTCMonth() + 1}/${validUntilDate.getUTCDate()}`

    try {
      const message = buildMaintenanceMessage({
        customerName: customer.name,
        ticketLabel,
        ticketValidUntil: validUntilStr,
        bookingUrl,
        bodyText,
      })

      const result = await pushMessage(customer.line_user_id, [message])

      await supabase.from('line_message_history').insert({
        customer_id: visit.customer_id,
        visit_history_id: visit.id,
        message_type: messageType,
        line_request_id: result.requestId,
        status: 'sent',
      })
      params.onSent()
    } catch (e) {
      const error = e as Error
      if (error.message === 'LINE_BLOCKED') {
        await supabase
          .from('customer')
          .update({ line_blocked: true })
          .eq('id', visit.customer_id)
        await supabase.from('line_message_history').insert({
          customer_id: visit.customer_id,
          visit_history_id: visit.id,
          message_type: messageType,
          status: 'blocked',
        })
      } else {
        await supabase.from('line_message_history').insert({
          customer_id: visit.customer_id,
          visit_history_id: visit.id,
          message_type: messageType,
          status: 'failed',
          error_message: error.message,
        })
      }
    }
  }
}
