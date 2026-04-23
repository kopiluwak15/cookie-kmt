import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { pushMessage } from '@/lib/line/client'
import { buildDormantMessage } from '@/lib/line/templates'
import { resolveBookingUrl } from '@/lib/line/booking-url'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Cron認証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  let dormantSent = 0

  // 予約URLを解決（dormant専用 → 共通の順）
  const bookingUrl = await resolveBookingUrl(supabase, 'dormant')

  // 平日案内テキストを取得
  const { data: settings } = await supabase
    .from('global_settings')
    .select('key, value')
    .eq('key', 'weekday_availability_text')

  const weekdayText =
    settings?.find((s) => s.key === 'weekday_availability_text')?.value ||
    '平日は比較的空きがございます。お気軽にご予約ください。'

  // DBテンプレートを取得
  const { data: dormantTemplate } = await supabase
    .from('line_template_settings')
    .select('body_text')
    .eq('template_type', 'dormant')
    .single()

  // 休眠顧客を取得
  const { data: targets, error } = await supabase.rpc('get_dormant_customers')

  if (error) {
    console.error('休眠顧客取得エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (targets) {
    for (const target of targets) {
      try {
        const message = buildDormantMessage({
          customerName: target.customer_name,
          weekdayText,
          bookingUrl,
          bodyText: dormantTemplate?.body_text || undefined,
        })

        const result = await pushMessage(target.line_user_id, [message])

        await supabase.from('line_message_history').insert({
          customer_id: target.customer_id,
          message_type: 'dormant',
          line_request_id: result.requestId,
          status: 'sent',
        })

        dormantSent++
      } catch (e) {
        const error = e as Error
        if (error.message === 'LINE_BLOCKED') {
          await supabase
            .from('customer')
            .update({ line_blocked: true })
            .eq('id', target.customer_id)
          await supabase.from('line_message_history').insert({
            customer_id: target.customer_id,
            message_type: 'dormant',
            status: 'blocked',
          })
        } else {
          await supabase.from('line_message_history').insert({
            customer_id: target.customer_id,
            message_type: 'dormant',
            status: 'failed',
            error_message: error.message,
          })
        }
      }
    }
  }

  return NextResponse.json({
    dormant_sent: dormantSent,
    timestamp: new Date().toISOString(),
  })
}
