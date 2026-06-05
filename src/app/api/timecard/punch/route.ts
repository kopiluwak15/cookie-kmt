// LIFF経由の打刻API
// LINE userId からスタッフ特定 → attendance 出退勤更新
// 経路（via）:
//   - "line_wifi": クライアントIPが店舗の許可IPと一致して打刻成功
//   - "line_gps":  GPSが店舗半径内で打刻成功（既存QR経路）
//   - WiFi 検証が有効な店舗で IP 一致しなかった場合は GPS にフォールバック
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyPendingVisitLogIfAllOut } from '@/lib/line/notify-pending-visitlog'
import {
  getClientIp,
  parseAllowedIps,
  isIpAllowed,
  addAllowedIp,
} from '@/lib/ip-check'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  lineUserId: string
  action: 'check_in' | 'check_out'
  gpsVerified?: boolean | null
  /** クライアントが「WiFi打刻として送信」したい場合 true。サーバーは自身で再検証する */
  preferWifi?: boolean
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.lineUserId || !body.action) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, is_active, store_id')
    .eq('line_user_id', body.lineUserId)
    .maybeSingle()

  if (!staff || !staff.is_active) {
    return NextResponse.json(
      { error: 'staff_not_linked', message: 'スタッフ情報が見つかりません' },
      { status: 404 }
    )
  }

  // 店舗の WiFi(IP) 設定をサーバーで再検証
  // クライアント自己申告は信用しない（preferWifi はヒントとしてのみ使用）
  let via: 'line_wifi' | 'line_gps' | null = null
  if (staff.store_id) {
    const { data: store } = await supabase
      .from('store')
      .select('timecard_wifi_enabled, timecard_allowed_ips')
      .eq('id', staff.store_id)
      .maybeSingle()

    if (store?.timecard_wifi_enabled) {
      const clientIp = getClientIp(req)
      const allowed = parseAllowedIps(store.timecard_allowed_ips)
      const result = isIpAllowed(clientIp, allowed)
      if (result.allowed && result.matched) {
        via = 'line_wifi'
        // last_seen_at を更新（ベストエフォート、失敗しても打刻自体は成功させる）
        const updated = addAllowedIp(allowed, result.matched.ip, result.matched.label, 5)
        supabase
          .from('store')
          .update({ timecard_allowed_ips: updated })
          .eq('id', staff.store_id)
          .then(({ error }) => {
            if (error) console.warn('[punch] last_seen_at update failed:', error.message)
          })
      }
    }
  }

  // WiFi で確定しなかった場合のみ GPS 経路として扱う
  if (!via && body.gpsVerified) {
    via = 'line_gps'
  }

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const now = new Date().toISOString()

  if (body.action === 'check_in') {
    const { error } = await supabase
      .from('attendance')
      .upsert(
        {
          staff_id: staff.id,
          date: today,
          checkin_time: now,
          checkin_gps_verified: body.gpsVerified ?? null,
          checkin_via: via,
        },
        { onConflict: 'staff_id,date' }
      )
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({
      ok: true,
      action: 'check_in',
      time: now,
      via,
      staff: { name: staff.name },
    })
  }

  // check_out
  const { error } = await supabase
    .from('attendance')
    .update({
      checkout_time: now,
      checkout_gps_verified: body.gpsVerified ?? null,
      checkout_via: via,
    })
    .eq('staff_id', staff.id)
    .eq('date', today)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 全員退勤したら施術ログ未入力通知を非同期で発火（レスポンスはブロックしない）
  notifyPendingVisitLogIfAllOut().catch((e) =>
    console.error('[punch/check_out] notifyPendingVisitLog error:', e)
  )

  return NextResponse.json({
    ok: true,
    action: 'check_out',
    time: now,
    via,
    staff: { name: staff.name },
  })
}
