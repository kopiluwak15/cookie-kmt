import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { pushMessage } from '@/lib/line/client'
import { buildReminder1Message, buildReminder2Message } from '@/lib/line/templates'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Cron認証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  let reminder1Sent = 0
  let reminder2Sent = 0

  // 予約URLを取得
  const { data: bookingSetting } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'booking_url')
    .single()
  const bookingUrl = bookingSetting?.value || ''

  // テンプレートを取得（リマインド①②両方）
  const { data: templates } = await supabase
    .from('line_template_settings')
    .select('template_type, body_text, coupon_text')
    .in('template_type', ['reminder1', 'reminder2'])

  const reminder1Template = templates?.find((t) => t.template_type === 'reminder1')
  const reminder2Template = templates?.find((t) => t.template_type === 'reminder2')
  const couponText = reminder2Template?.coupon_text || '次回ご来店時に使えるクーポンをプレゼント！'

  // ========== リマインド① ==========
  const { data: targets1, error: err1 } = await supabase.rpc('get_reminder1_targets')

  if (err1) {
    console.error('リマインド①対象取得エラー:', err1)
  } else if (targets1) {
    for (const target of targets1) {
      try {
        const message = buildReminder1Message({
          customerName: target.customer_name,
          styleName: target.style_name,
          cycleDays: target.reminder1_days,
          bookingUrl,
          bodyText: reminder1Template?.body_text || undefined,
        })

        const result = await pushMessage(target.line_user_id, [message])

        await supabase.from('line_message_history').insert({
          customer_id: target.customer_id,
          visit_history_id: target.visit_id,
          message_type: 'reminder1',
          line_request_id: result.requestId,
          status: 'sent',
        })

        reminder1Sent++
      } catch (e) {
        const error = e as Error
        if (error.message === 'LINE_BLOCKED') {
          await supabase
            .from('customer')
            .update({ line_blocked: true })
            .eq('id', target.customer_id)
          await supabase.from('line_message_history').insert({
            customer_id: target.customer_id,
            visit_history_id: target.visit_id,
            message_type: 'reminder1',
            status: 'blocked',
          })
        } else {
          await supabase.from('line_message_history').insert({
            customer_id: target.customer_id,
            visit_history_id: target.visit_id,
            message_type: 'reminder1',
            status: 'failed',
            error_message: error.message,
          })
        }
      }
    }
  }

  // ========== リマインド② ==========
  const { data: targets2, error: err2 } = await supabase.rpc('get_reminder2_targets')

  if (err2) {
    console.error('リマインド②対象取得エラー:', err2)
  } else if (targets2) {
    for (const target of targets2) {
      try {
        const message = buildReminder2Message({
          customerName: target.customer_name,
          couponText,
          bookingUrl,
          bodyText: reminder2Template?.body_text || undefined,
        })

        const result = await pushMessage(target.line_user_id, [message])

        await supabase.from('line_message_history').insert({
          customer_id: target.customer_id,
          visit_history_id: target.visit_id,
          message_type: 'reminder2',
          line_request_id: result.requestId,
          status: 'sent',
        })

        reminder2Sent++
      } catch (e) {
        const error = e as Error
        if (error.message === 'LINE_BLOCKED') {
          await supabase
            .from('customer')
            .update({ line_blocked: true })
            .eq('id', target.customer_id)
          await supabase.from('line_message_history').insert({
            customer_id: target.customer_id,
            visit_history_id: target.visit_id,
            message_type: 'reminder2',
            status: 'blocked',
          })
        } else {
          await supabase.from('line_message_history').insert({
            customer_id: target.customer_id,
            visit_history_id: target.visit_id,
            message_type: 'reminder2',
            status: 'failed',
            error_message: error.message,
          })
        }
      }
    }
  }

  return NextResponse.json({
    reminder1_sent: reminder1Sent,
    reminder2_sent: reminder2Sent,
    timestamp: new Date().toISOString(),
  })
}
