/**
 * 位置情報ユーティリティ
 *
 * 顧客 LIFF/QR チェックインのジオフェンス検証に使用する。
 * （スタッフ打刻のGPS検証は src/app/(app)/staff/labor-management/page.tsx 内で実装済み）
 */

export interface CheckLocationParams {
  /** 店舗座標（DBから取得） */
  storeLat: number | null
  storeLng: number | null
  /** 半径（メートル）。null/undefined の場合 50m を使う */
  storeRadiusMeters: number | null | undefined
  /** GPS検証を有効化するか。NULL は true 扱い（既存運用との後方互換） */
  storeGpsEnabled: boolean | null | undefined
  /** ユーザー座標（フロントから取得した brawser geolocation） */
  userLat: number | null
  userLng: number | null
}

export type LocationCheckReason =
  | 'ok'
  | 'gps_disabled'
  | 'no_store_coords'
  | 'gps_unavailable'
  | 'too_far'

export interface LocationCheckResult {
  ok: boolean
  reason: LocationCheckReason
  distanceMeters?: number
  radiusMeters?: number
}

const DEFAULT_RADIUS_METERS = 50

/**
 * Haversine 公式で2点間の地表距離（メートル）を返す。
 * - 地球半径 R = 6371000m
 */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * 顧客チェックインの位置検証。
 *
 * 設計方針:
 * - storeGpsEnabled === false → 通過（運用で明示的に無効化）
 * - 店舗座標 null → 通過（運用ミス回避＝フェイルオープン）
 * - userLat/userLng null → 拒否（GPS取得失敗・許可拒否）
 * - 距離 > radius → 拒否
 * - それ以外 → 通過
 */
export function checkLocationWithinStore(
  params: CheckLocationParams
): LocationCheckResult {
  const {
    storeLat,
    storeLng,
    storeRadiusMeters,
    storeGpsEnabled,
    userLat,
    userLng,
  } = params

  // GPS検証を明示無効
  if (storeGpsEnabled === false) {
    return { ok: true, reason: 'gps_disabled' }
  }

  // 店舗座標が未設定 → 運用ミスを避けるためフェイルオープン
  if (
    storeLat == null ||
    storeLng == null ||
    !Number.isFinite(storeLat) ||
    !Number.isFinite(storeLng)
  ) {
    return { ok: true, reason: 'no_store_coords' }
  }

  // ユーザー位置が取れていない → 拒否
  if (
    userLat == null ||
    userLng == null ||
    !Number.isFinite(userLat) ||
    !Number.isFinite(userLng)
  ) {
    return { ok: false, reason: 'gps_unavailable' }
  }

  const radius =
    typeof storeRadiusMeters === 'number' && storeRadiusMeters > 0
      ? storeRadiusMeters
      : DEFAULT_RADIUS_METERS
  const distance = haversineMeters(storeLat, storeLng, userLat, userLng)

  if (distance > radius) {
    return {
      ok: false,
      reason: 'too_far',
      distanceMeters: Math.round(distance),
      radiusMeters: radius,
    }
  }

  return { ok: true, reason: 'ok', distanceMeters: Math.round(distance), radiusMeters: radius }
}
