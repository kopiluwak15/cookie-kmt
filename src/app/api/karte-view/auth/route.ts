import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** スタッフ認証 + 店舗GPS情報を返す */
export async function POST(req: NextRequest) {
  const { lineUserId } = (await req.json()) as { lineUserId?: string }

  if (!lineUserId) {
    return NextResponse.json({ error: 'LINE認証情報が必要です' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: staff } = await supabase
    .from('staff')
    .select('id, store_id, is_active')
    .eq('line_user_id', lineUserId)
    .single()

  if (!staff || !staff.is_active) {
    return NextResponse.json({ error: 'スタッフとして登録されていません' }, { status: 403 })
  }

  // 店舗GPS情報
  let store: {
    latitude: number | null
    longitude: number | null
    gps_radius_meters: number
    gps_enabled: boolean
  } | null = null

  if (staff.store_id) {
    const { data } = await supabase
      .from('store')
      .select('latitude, longitude, gps_radius_meters, gps_enabled')
      .eq('id', staff.store_id)
      .single()
    store = data
  }

  return NextResponse.json({ ok: true, store })
}
