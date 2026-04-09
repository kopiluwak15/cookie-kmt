// LIFF経由の打刻API
// LINE userId からスタッフ特定 → attendance 出退勤更新
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  lineUserId: string
  action: 'check_in' | 'check_out'
  gpsVerified?: boolean | null
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
    .select('id, name, is_active')
    .eq('line_user_id', body.lineUserId)
    .maybeSingle()

  if (!staff || !staff.is_active) {
    return NextResponse.json(
      { error: 'staff_not_linked', message: 'スタッフ情報が見つかりません' },
      { status: 404 }
    )
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
        },
        { onConflict: 'staff_id,date' }
      )
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, action: 'check_in', time: now, staff: { name: staff.name } })
  }

  // check_out
  const { error } = await supabase
    .from('attendance')
    .update({
      checkout_time: now,
      checkout_gps_verified: body.gpsVerified ?? null,
    })
    .eq('staff_id', staff.id)
    .eq('date', today)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, action: 'check_out', time: now, staff: { name: staff.name } })
}
