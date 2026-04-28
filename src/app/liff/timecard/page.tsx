'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, Clock, MapPin, AlertCircle, Bell, X } from 'lucide-react'

/**
 * LIFFウィンドウを閉じる。
 * - LINE内ブラウザ → liff.closeWindow() で確実に閉じる
 * - 外部ブラウザ → window.close()（開かれた経路によっては効かない）
 */
async function closeLiffWindow() {
  try {
    const mod = await import('@line/liff')
    const liff = mod.default
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (liffId) {
      try {
        await liff.init({ liffId })
      } catch {
        // 既に初期化済 or 初期化失敗でもcloseWindowは試す
      }
    }
    try {
      liff.closeWindow()
      return
    } catch {
      // closeWindow失敗時はフォールバックへ
    }
  } catch {
    // import失敗 → フォールバックへ
  }
  try {
    window.close()
  } catch {
    // 何もできない場合は静かに無視
  }
}

type Mode = 'loading' | 'ready' | 'done' | 'success' | 'error'

type Announcement = {
  id: string
  title: string
  content: string
  importance: '重要' | '確認' | '指示' | 'お知らせ' | 'その他'
  delivery_timing: 'check_in' | 'check_out'
}

type CheckResp = {
  staff: { id: string; name: string }
  store: {
    latitude: number | null
    longitude: number | null
    gps_radius_meters: number
    gps_enabled: boolean
  } | null
  attendance: { checkin_time: string | null; checkout_time: string | null } | null
  nextAction: 'check_in' | 'check_out' | 'done'
  today: string
  announcements?: Announcement[]
}

const IMPORTANCE_MARK: Record<string, string> = {
  重要: '🔴',
  確認: '🟠',
  指示: '🟡',
  お知らせ: '🟢',
  その他: '⚪',
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
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

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
}

export default function LiffTimecardPage() {
  return (
    <Suspense
      fallback={
        <main
          className="bg-gradient-to-b from-gray-50 to-white flex items-center justify-center"
          style={{ minHeight: '100dvh' }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </main>
      }
    >
      <LiffTimecardInner />
    </Suspense>
  )
}

function LiffTimecardInner() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('loading')
  const [message, setMessage] = useState('LINE認証中...')
  const [error, setError] = useState('')
  const [info, setInfo] = useState<CheckResp | null>(null)
  const [lineUserId, setLineUserId] = useState('')
  const [gpsVerified, setGpsVerified] = useState<boolean | null>(null)
  const [gpsDistance, setGpsDistance] = useState<number | null>(null)
  const [gpsError, setGpsError] = useState('')
  const [punching, setPunching] = useState(false)
  const [successAction, setSuccessAction] = useState<'check_in' | 'check_out' | null>(null)
  const [successTime, setSuccessTime] = useState('')
  // 打刻成功画面の自動クローズ用カウントダウン（3秒）
  const [secondsToClose, setSecondsToClose] = useState(3)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        // /liff/welcome からリダイレクトされた外部ブラウザでは lid が query に付く
        const qLid = searchParams?.get('lid')
        const userId =
          qLid ||
          (typeof window !== 'undefined'
            ? sessionStorage.getItem('liff_line_user_id') || ''
            : '')

        if (!userId) {
          setError('LINE認証情報が取得できませんでした。\nLINEから再度QRコードを読み取ってください。')
          setMode('error')
          return
        }
        setLineUserId(userId)

        setMessage('スタッフ情報を確認中...')
        const res = await fetch('/api/timecard/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineUserId: userId }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.message || data.error || '確認に失敗しました')
        }

        setInfo(data)
        setAnnouncements(data.announcements || [])

        if (data.nextAction === 'done') {
          setMode('done')
          return
        }

        // GPS check
        if (
          data.store?.gps_enabled &&
          data.store.latitude != null &&
          data.store.longitude != null
        ) {
          setMessage('位置情報を取得中...')
          if (!navigator.geolocation) {
            setGpsError('この端末は位置情報に対応していません')
            setGpsVerified(false)
            setMode('ready')
            return
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const dist = haversineMeters(
                pos.coords.latitude,
                pos.coords.longitude,
                data.store!.latitude!,
                data.store!.longitude!
              )
              setGpsDistance(dist)
              setGpsVerified(dist <= data.store!.gps_radius_meters)
              setMode('ready')
            },
            (err) => {
              setGpsError(err.message || '位置情報取得に失敗しました')
              setGpsVerified(false)
              setMode('ready')
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          )
        } else {
          setGpsVerified(null)
          setMode('ready')
        }
      } catch (err) {
        console.error('LIFF timecard error:', err)
        setError(err instanceof Error ? err.message : '初期化に失敗しました')
        setMode('error')
      }
    }
    init()
  }, [])

  // 打刻成功時、3秒カウントダウン → 自動でLIFFを閉じる
  useEffect(() => {
    if (mode !== 'success') return
    if (secondsToClose <= 0) {
      closeLiffWindow()
      return
    }
    const t = setTimeout(() => setSecondsToClose((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [mode, secondsToClose])

  async function handleConfirmAnnouncement(announcementId: string) {
    if (confirming) return
    setConfirming(announcementId)
    try {
      const res = await fetch('/api/timecard/confirm-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId, announcementId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '確認に失敗しました')
      setConfirmedIds((prev) => new Set([...prev, announcementId]))
    } catch (err) {
      setError(err instanceof Error ? err.message : '確認に失敗しました')
    } finally {
      setConfirming(null)
    }
  }

  async function handlePunch() {
    if (!info || !lineUserId) return
    const action = info.nextAction
    if (action === 'done') return

    setPunching(true)
    try {
      const res = await fetch('/api/timecard/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId,
          action,
          gpsVerified,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '打刻に失敗しました')
      }
      setSuccessAction(action as 'check_in' | 'check_out')
      setSuccessTime(formatTime(data.time))
      setMode('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '打刻に失敗しました')
      setMode('error')
    } finally {
      setPunching(false)
    }
  }

  if (mode === 'loading') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-amber-600" />
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </main>
    )
  }

  if (mode === 'error') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-red-200 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-700 mb-2">エラー</h2>
          <p className="text-sm text-gray-600 mb-6 whitespace-pre-wrap">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            もう一度試す
          </button>
        </div>
      </main>
    )
  }

  if (mode === 'success' && successAction) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 mx-auto mb-5 flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {successAction === 'check_in' ? '出勤しました' : '退勤しました'}
          </h1>
          {info?.staff.name && (
            <p className="text-sm text-gray-600 mb-6">{info.staff.name} さん お疲れさまです</p>
          )}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-4">
            <Clock className="h-5 w-5 text-gray-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{successTime}</p>
          </div>

          {/* 閉じるボタン＋自動クローズカウントダウン */}
          <button
            type="button"
            onClick={() => {
              setSecondsToClose(0) // useEffect 経由で確実に1経路に揃える
              closeLiffWindow()
            }}
            className="w-full mt-6 py-3.5 rounded-xl bg-gray-900 text-white font-semibold inline-flex items-center justify-center gap-2 active:opacity-80"
          >
            <X className="h-4 w-4" />
            閉じる
          </button>
          <p className="text-xs text-gray-500 mt-3">
            {secondsToClose > 0 ? `${secondsToClose}秒後に自動で閉じます` : '閉じています...'}
          </p>

          <p className="text-xs text-gray-400 mt-8">COOKIE 熊本</p>
        </div>
      </main>
    )
  }

  if (mode === 'done' && info) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 mx-auto mb-5 flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">本日の勤務は完了しています</h1>
          <p className="text-sm text-gray-600 mb-6">{info.staff.name} さん</p>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">出勤</span>
              <span className="font-medium tabular-nums">
                {formatTime(info.attendance?.checkin_time ?? null)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">退勤</span>
              <span className="font-medium tabular-nums">
                {formatTime(info.attendance?.checkout_time ?? null)}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-8">COOKIE 熊本</p>
        </div>
      </main>
    )
  }

  // ready
  if (!info) return null
  const action = info.nextAction
  const actionLabel = action === 'check_in' ? '出勤' : '退勤'
  const gpsRequired = !!info.store?.gps_enabled
  const gpsOk = !gpsRequired || gpsVerified === true
  const allAnnouncementsConfirmed =
    announcements.length === 0 || confirmedIds.size === announcements.length
  const canPunch = gpsOk && allAnnouncementsConfirmed

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white px-6 py-10 flex items-center justify-center">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <Clock className="h-10 w-10 text-gray-700 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">タイムカード</h1>
          <p className="text-sm text-gray-600 mt-1">{info.staff.name} さん</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 space-y-3">
          {info.attendance?.checkin_time && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">本日の出勤</span>
              <span className="font-medium tabular-nums">
                {formatTime(info.attendance.checkin_time)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-center pt-2">
            <span
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                action === 'check_in'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              これから {actionLabel} します
            </span>
          </div>
        </div>

        {gpsRequired && (
          <div
            className={`rounded-2xl border p-4 mb-4 ${
              gpsVerified === true
                ? 'bg-green-50 border-green-200'
                : gpsVerified === false
                ? 'bg-red-50 border-red-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start gap-2">
              <MapPin
                className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  gpsVerified === true
                    ? 'text-green-600'
                    : gpsVerified === false
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              />
              <div className="text-sm">
                {gpsVerified === true && (
                  <p className="text-green-800 font-medium">店舗内で確認できました</p>
                )}
                {gpsVerified === false && (
                  <>
                    <p className="text-red-800 font-medium">店舗から離れています</p>
                    {gpsError && <p className="text-red-700 text-xs mt-1">{gpsError}</p>}
                    {gpsDistance != null && (
                      <p className="text-red-700 text-xs mt-1">
                        距離: 約 {Math.round(gpsDistance)}m / 許容: {info.store?.gps_radius_meters}m
                      </p>
                    )}
                  </>
                )}
                {gpsVerified === null && (
                  <p className="text-gray-700">位置情報を取得しています...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {announcements.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-bold text-amber-900">
                {action === 'check_in' ? '出勤時' : '退勤時'}のお知らせ (
                {confirmedIds.size}/{announcements.length})
              </h2>
            </div>
            <div className="space-y-3">
              {announcements.map((a) => {
                const isConfirmed = confirmedIds.has(a.id)
                return (
                  <div
                    key={a.id}
                    className={`rounded-xl border-2 p-3 transition ${
                      isConfirmed
                        ? 'bg-green-50 border-green-300'
                        : 'bg-white border-amber-300'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-lg leading-none">
                        {IMPORTANCE_MARK[a.importance] || '⚪'}
                      </span>
                      <h3 className="font-bold text-sm text-gray-900 flex-1 break-words leading-snug">
                        {a.title}
                      </h3>
                      {isConfirmed && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap break-words leading-relaxed mb-2">
                      {a.content}
                    </p>
                    {!isConfirmed && (
                      <button
                        type="button"
                        onClick={() => handleConfirmAnnouncement(a.id)}
                        disabled={confirming === a.id}
                        className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-xs font-bold disabled:opacity-40"
                      >
                        {confirming === a.id ? '確認中...' : '確認しました'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {announcements.length > 0 && !allAnnouncementsConfirmed && (
          <p className="text-center text-xs text-amber-800 bg-amber-100 py-2 rounded-lg mb-3">
            すべてのお知らせを確認してください
          </p>
        )}

        <button
          onClick={handlePunch}
          disabled={!canPunch || punching}
          className={`w-full py-5 rounded-2xl text-lg font-bold text-white transition ${
            canPunch && !punching
              ? action === 'check_in'
                ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {punching ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              送信中...
            </span>
          ) : (
            `${actionLabel}を打刻する`
          )}
        </button>

        {gpsRequired && gpsVerified === false && (
          <p className="text-xs text-gray-500 text-center mt-3">
            店舗内で位置情報をオンにしてもう一度お試しください
          </p>
        )}

        <p className="text-xs text-gray-400 text-center mt-8">COOKIE 熊本</p>
      </div>
    </main>
  )
}
