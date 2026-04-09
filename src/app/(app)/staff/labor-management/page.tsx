'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTodayAttendanceStatus, getStoreLocation } from '@/actions/labor-management'
import { Loader2, MapPinOff, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * 2点間の距離（メートル）をHaversine公式で計算
 */
function calcDistanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000 // 地球半径(m)
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type GpsState =
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'no_store_location' }  // 店舗に座標未設定 → GPS検証スキップ
  | { status: 'too_far'; distance: number; radius: number }
  | { status: 'denied' }
  | { status: 'unavailable'; message: string }

export default function LaborManagementPage() {
  const router = useRouter()
  const [gpsState, setGpsState] = useState<GpsState>({ status: 'checking' })
  const [retrying, setRetrying] = useState(false)

  const verifyAndRedirect = async () => {
    setGpsState({ status: 'checking' })

    try {
      // 店舗の位置情報を取得
      const locResult = await getStoreLocation()

      if (locResult.error || !locResult.location) {
        // 店舗情報取得失敗 → GPS検証スキップして通過 (gps_verified = null)
        sessionStorage.setItem('gps_verified', 'null')
        await redirectByStatus()
        return
      }

      const { latitude, longitude, radiusMeters, gpsEnabled } = locResult.location

      // GPS機能がOFF → 検証スキップ (gps_verified = null)
      if (!gpsEnabled) {
        sessionStorage.setItem('gps_verified', 'null')
        await redirectByStatus()
        return
      }

      // 店舗に座標が未設定 → GPS検証スキップ (gps_verified = null)
      if (latitude === null || longitude === null) {
        sessionStorage.setItem('gps_verified', 'null')
        await redirectByStatus()
        return
      }

      // ブラウザで位置情報を取得
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })

      const distance = calcDistanceMeters(
        position.coords.latitude,
        position.coords.longitude,
        latitude,
        longitude
      )

      if (distance <= radiusMeters) {
        // 範囲内 → 出退勤ページへ (gps_verified = true)
        sessionStorage.setItem('gps_verified', 'true')
        await redirectByStatus()
      } else {
        setGpsState({
          status: 'too_far',
          distance: Math.round(distance),
          radius: radiusMeters,
        })
      }
    } catch (err: any) {
      if (err?.code === 1) {
        // PERMISSION_DENIED
        setGpsState({ status: 'denied' })
      } else if (err?.code === 2) {
        setGpsState({ status: 'unavailable', message: '位置情報を取得できませんでした' })
      } else if (err?.code === 3) {
        setGpsState({ status: 'unavailable', message: '位置情報の取得がタイムアウトしました' })
      } else {
        setGpsState({ status: 'unavailable', message: '位置情報の確認中にエラーが発生しました' })
      }
    }
  }

  const redirectByStatus = async () => {
    const result = await getTodayAttendanceStatus()

    if (result.error) {
      router.replace('/staff/labor-management/check-in')
      return
    }

    if (result.status === 'checked_in') {
      router.replace('/staff/labor-management/check-out')
    } else {
      router.replace('/staff/labor-management/check-in')
    }
  }

  useEffect(() => {
    verifyAndRedirect()
  }, [])

  const handleRetry = async () => {
    setRetrying(true)
    await verifyAndRedirect()
    setRetrying(false)
  }

  // ローディング中
  if (gpsState.status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Navigation className="h-8 w-8 animate-pulse text-blue-600" />
          <p className="text-sm text-gray-600">位置情報を確認中...</p>
        </div>
      </div>
    )
  }

  // エラー表示
  if (gpsState.status === 'too_far' || gpsState.status === 'denied' || gpsState.status === 'unavailable') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-red-200">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <MapPinOff className="h-14 w-14 text-red-500 mx-auto" />

            {gpsState.status === 'too_far' && (
              <>
                <h2 className="text-xl font-bold text-red-700">店舗の範囲外です</h2>
                <p className="text-sm text-gray-600">
                  現在地は店舗から約<span className="font-bold">{gpsState.distance}m</span>離れています。
                  <br />
                  許容範囲: {gpsState.radius}m以内
                </p>
              </>
            )}

            {gpsState.status === 'denied' && (
              <>
                <h2 className="text-xl font-bold text-red-700">位置情報が許可されていません</h2>
                <p className="text-sm text-gray-600">
                  ブラウザの設定から位置情報の使用を許可してください。
                </p>
              </>
            )}

            {gpsState.status === 'unavailable' && (
              <>
                <h2 className="text-xl font-bold text-red-700">位置情報エラー</h2>
                <p className="text-sm text-gray-600">{gpsState.message}</p>
              </>
            )}

            <Button
              onClick={handleRetry}
              disabled={retrying}
              className="w-full"
              variant="outline"
            >
              {retrying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              再確認
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // OK / no_store_location → リダイレクト中
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>ステータスを確認中...</p>
      </div>
    </div>
  )
}
