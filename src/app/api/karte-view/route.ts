import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCounselingToken } from '@/lib/counseling/token'
import { getKarteViewData } from '@/actions/karte-view'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, lineUserId } = body as { token?: string; lineUserId?: string }

  // 1. トークン検証
  const verified = verifyCounselingToken(token)
  if (!verified) {
    return NextResponse.json(
      { error: 'トークンが無効または期限切れです' },
      { status: 401 }
    )
  }

  // 2. LINE userId でスタッフ確認
  if (!lineUserId) {
    return NextResponse.json(
      { error: 'LINE認証情報が必要です' },
      { status: 401 }
    )
  }

  const supabase = createAdminClient()
  const { data: staff } = await supabase
    .from('staff')
    .select('id, store_id, is_active')
    .eq('line_user_id', lineUserId)
    .single()

  if (!staff || !staff.is_active) {
    return NextResponse.json(
      { error: 'スタッフとして登録されていません' },
      { status: 403 }
    )
  }

  // 3. 店舗GPS情報を取得（クライアント側でGPS検証に使用）
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

  // 4. カルテデータ取得
  const karteData = await getKarteViewData(verified.customerId)
  if (!karteData) {
    return NextResponse.json(
      { error: '顧客が見つかりません' },
      { status: 404 }
    )
  }

  return NextResponse.json({ ...karteData, store })
}
