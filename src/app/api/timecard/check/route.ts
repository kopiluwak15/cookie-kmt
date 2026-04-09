// LINE userId からスタッフを特定し本日の出退勤状況を返す
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let body: { lineUserId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.lineUserId) {
    return NextResponse.json({ error: 'missing_line_user_id' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: staff, error: staffErr } = await supabase
    .from('staff')
    .select('id, name, store_id, is_active')
    .eq('line_user_id', body.lineUserId)
    .maybeSingle()

  if (staffErr) {
    return NextResponse.json({ error: staffErr.message }, { status: 500 })
  }
  if (!staff) {
    return NextResponse.json({
      error: 'staff_not_linked',
      message: 'このLINEアカウントはスタッフに紐付いていません。管理者にご連絡ください。',
    }, { status: 404 })
  }
  if (!staff.is_active) {
    return NextResponse.json({ error: 'staff_inactive', message: '無効なスタッフです' }, { status: 403 })
  }

  // 店舗位置情報
  let store: { latitude: number | null; longitude: number | null; gps_radius_meters: number; gps_enabled: boolean } | null = null
  if (staff.store_id) {
    const { data } = await supabase
      .from('store')
      .select('latitude, longitude, gps_radius_meters, gps_enabled')
      .eq('id', staff.store_id)
      .maybeSingle()
    if (data) store = data
  }

  // 本日の出退勤
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: attendance } = await supabase
    .from('attendance')
    .select('checkin_time, checkout_time')
    .eq('staff_id', staff.id)
    .eq('date', today)
    .maybeSingle()

  let nextAction: 'check_in' | 'check_out' | 'done' = 'check_in'
  if (attendance?.checkin_time && !attendance?.checkout_time) nextAction = 'check_out'
  else if (attendance?.checkin_time && attendance?.checkout_time) nextAction = 'done'

  return NextResponse.json({
    staff: { id: staff.id, name: staff.name },
    store,
    attendance: attendance || null,
    nextAction,
    today,
  })
}
