'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, MapPinOff, ShieldAlert, AlertCircle, CheckCircle2 } from 'lucide-react'

function haversineMeters(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export default function LiffKartePage() {
  return (
    <Suspense
      fallback={
        <main className="bg-gradient-to-b from-gray-50 to-white flex items-center justify-center" style={{ minHeight: '100dvh' }}>
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </main>
      }
    >
      <LiffKarteInner />
    </Suspense>
  )
}

type Phase = 'loading' | 'done' | 'error'

function LiffKarteInner() {
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('loading')
  const [message, setMessage] = useState('認証確認中...')
  const [error, setError] = useState('')
  const [errorIcon, setErrorIcon] = useState<'alert' | 'gps' | 'shield'>('alert')

  useEffect(() => {
    const init = async () => {
      try {
        const lid = searchParams?.get('lid') ||
          (typeof window !== 'undefined' ? sessionStorage.getItem('liff_line_user_id') || '' : '')
        const sc = searchParams?.get('sc') || ''

        if (!lid) {
          setErrorIcon('alert')
          setError('LINE認証情報が取得できませんでした。\nLINEから再度QRコードを読み取ってください。')
          setPhase('error')
          return
        }

        if (!sc) {
          setErrorIcon('alert')
          setError('セッション情報が見つかりません。\niPadのQRを再度読み取ってください。')
          setPhase('error')
          return
        }

        // スタッフ確認 + GPS情報取得
        setMessage('スタッフ情報を確認中...')
        const authRes = await fetch('/api/karte-view/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineUserId: lid }),
        })
        const authData = await authRes.json()

        if (!authRes.ok) {
          setErrorIcon(authRes.status === 403 ? 'shield' : 'alert')
          setError(authData.error || '認証に失敗しました')
          setPhase('error')
          return
        }

        // GPS検証
        const store = authData.store
        if (store?.gps_enabled && store.latitude != null && store.longitude != null) {
          setMessage('位置情報を確認中...')

          if (!navigator.geolocation) {
            setErrorIcon('gps')
            setError('この端末は位置情報に対応していません。\n店舗内でのみ使用できます。')
            setPhase('error')
            return
          }

          const gpsResult = await new Promise<{ ok: boolean; distance?: number; error?: string }>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const dist = haversineMeters(
                  pos.coords.latitude, pos.coords.longitude,
                  store.latitude!, store.longitude!
                )
                resolve({ ok: dist <= store.gps_radius_meters, distance: dist })
              },
              (err) => {
                resolve({ ok: false, error: err.message || '位置情報取得に失敗しました' })
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            )
          })

          if (!gpsResult.ok) {
            setErrorIcon('gps')
            setError(
              gpsResult.error
                ? `位置情報の取得に失敗しました。\n${gpsResult.error}\n\n店舗内でのみ使用できます。`
                : `店舗の範囲外です（${Math.round(gpsResult.distance!)}m）。\n店舗内でのみ使用できます。`
            )
            setPhase('error')
            return
          }
        }

        // セッション有効化
        setMessage('認証を完了しています...')
        const activateRes = await fetch('/api/karte-view/session/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionCode: sc, lineUserId: lid }),
        })
        const activateData = await activateRes.json()

        if (!activateRes.ok) {
          setErrorIcon('alert')
          setError(activateData.error || 'セッションの認証に失敗しました')
          setPhase('error')
          return
        }

        // 完了
        setPhase('done')

        // LIFF内ならcloseWindow
        try {
          const liff = (await import('@line/liff')).default
          if (liff.isInClient()) {
            setTimeout(() => liff.closeWindow(), 2000)
          }
        } catch {
          // LIFFでない場合は無視
        }
      } catch (err) {
        console.error('karte auth error:', err)
        setErrorIcon('alert')
        setError(err instanceof Error ? err.message : '初期化に失敗しました')
        setPhase('error')
      }
    }
    init()
  }, [searchParams])

  // エラー画面
  if (phase === 'error') {
    const Icon = errorIcon === 'gps' ? MapPinOff : errorIcon === 'shield' ? ShieldAlert : AlertCircle
    const iconColor = errorIcon === 'gps' ? 'text-orange-500' : 'text-red-500'

    return (
      <main className="bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6" style={{ minHeight: '100dvh' }}>
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <Icon className={`h-12 w-12 ${iconColor} mx-auto mb-4`} />
          <h2 className="text-lg font-bold text-gray-900 mb-3">認証できませんでした</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            もう一度試す
          </button>
        </div>
      </main>
    )
  }

  // 完了画面
  if (phase === 'done') {
    return (
      <main className="bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-6" style={{ minHeight: '100dvh' }}>
        <div className="max-w-sm w-full bg-white rounded-2xl border border-emerald-200 p-8 text-center shadow-sm">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">認証完了</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            iPadでカルテを閲覧できます。
            <br />
            この画面は閉じて大丈夫です。
          </p>
        </div>
      </main>
    )
  }

  // ローディング
  return (
    <main className="bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6" style={{ minHeight: '100dvh' }}>
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto mb-4" />
        <p className="text-sm text-gray-700 font-medium">{message}</p>
      </div>
    </main>
  )
}
