/**
 * 安全策 cron: 閉店後に施術ログ未入力をチェックしてスタッフに通知
 * 退勤時トリガーと重複しないよう staff_notification_log で制御済み
 *
 * Vercel Cron: 毎日 22:00 JST (13:00 UTC) 推奨
 */
import { NextRequest, NextResponse } from 'next/server'
import { notifyPendingVisitLogIfAllOut } from '@/lib/line/notify-pending-visitlog'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await notifyPendingVisitLogIfAllOut()
    return NextResponse.json({ ok: true, result })
  } catch (e) {
    const err = e as Error
    console.error('[cron/check-pending-visitlog] error:', err)
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    )
  }
}
