/**
 * 顧客チェックインAPIで使うジオフェンス検証ヘルパー（サーバー側）
 *
 * /api/karte/check, /api/karte, /api/survey/check で共通利用。
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from './supabase/admin'
import { checkLocationWithinStore } from './geo'

export interface GpsCheckBody {
  lat?: number | null
  lng?: number | null
}

interface OkResult {
  ok: true
}

interface NgResult {
  ok: false
  response: NextResponse
}

/**
 * 店舗座標と body の lat/lng を比較し、範囲外なら 403 レスポンスを返す。
 *
 * 戻り値が ok:false の場合、呼び出し側はそのまま `result.response` を return する。
 */
export async function performStoreGpsCheck(
  body: GpsCheckBody
): Promise<OkResult | NgResult> {
  const supabase = createAdminClient()

  // シングル店舗運用: 最も古い店舗を採用（運用上1店舗のみのはず）
  const { data: store } = await supabase
    .from('store')
    .select('latitude, longitude, gps_radius_meters, gps_enabled')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const result = checkLocationWithinStore({
    storeLat: store?.latitude ?? null,
    storeLng: store?.longitude ?? null,
    storeRadiusMeters: store?.gps_radius_meters ?? null,
    storeGpsEnabled: store?.gps_enabled ?? null,
    userLat: typeof body.lat === 'number' ? body.lat : null,
    userLng: typeof body.lng === 'number' ? body.lng : null,
  })

  if (result.ok) return { ok: true }

  // エラーメッセージ
  let message = '位置情報の検証に失敗しました'
  if (result.reason === 'gps_unavailable') {
    message = '位置情報が取得できません。ブラウザの位置情報許可を確認してください。'
  } else if (result.reason === 'too_far') {
    message = `店舗から離れすぎています（${result.distanceMeters}m / 許容${result.radiusMeters}m）。店舗内でアクセスしてください。`
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: 'gps_check_failed',
        reason: result.reason,
        distanceMeters: result.distanceMeters,
        radiusMeters: result.radiusMeters,
        message,
      },
      { status: 403 }
    ),
  }
}
