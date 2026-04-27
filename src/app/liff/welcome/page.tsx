'use client'

// LIFF は「LINE認証」と「ブロック検知ゲート」に使用する。
//
// 友達追加の動線:
//   LINE Developers の LIFF 設定「友だち追加オプション (Aggressive)」により、
//   未追加ユーザーには LINE 側が自動で「許可→友達追加→LIFF」を実行する。
//   これは cookie-crm と同じ動線で、Android でも確実に動く。
//
// 注意点（LIFF Aggressive の穴）:
//   ブロック中のユーザーは LINE にとって「既知」扱いのため Aggressive が
//   スキップされ、ブロックしたまま LIFF が開いてしまう。
//   → その場合のみ /api/check-friendship が isBlocked=true を返すので、
//     アプリ側でゲートを表示してブロック解除を案内する。
//
// それ以外（新規 / 既存友達）はゲートを挟まず、そのまま次画面へ素通りさせる。

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import liff from '@line/liff'
import { Loader2, ExternalLink, AlertCircle, UserPlus, RefreshCw, MapPinOff } from 'lucide-react'
import { getUserCoords } from '@/lib/geo-client'

export default function LiffWelcomePage() {
  return (
    <Suspense
      fallback={
        <main
          className="bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6"
          style={{ minHeight: '100dvh' }}
        >
          <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
        </main>
      }
    >
      <LiffWelcomeInner />
    </Suspense>
  )
}

function LiffWelcomeInner() {
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('LINE認証中...')
  const [error, setError] = useState('')
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null)
  // ブロック中ユーザー向けのゲート state
  const [blockedGate, setBlockedGate] = useState<{ friendAddUrl: string } | null>(null)
  // ジオフェンス検証エラー（店舗外/位置取得失敗）
  const [gpsError, setGpsError] = useState<{
    reason: string
    message: string
    distanceMeters?: number
    radiusMeters?: number
  } | null>(null)

  const proceedAfterAuth = useCallback(
    async (lid: string, dn: string) => {
      const mode = searchParams?.get('mode')
      const appUrl = window.location.origin
      let targetUrl: string

      if (mode === 'timecard') {
        targetUrl = `${appUrl}/liff/timecard?lid=${encodeURIComponent(lid)}&dn=${encodeURIComponent(dn)}`
      } else if (mode === 'karte') {
        const sc = searchParams?.get('sc') || ''
        targetUrl = `${appUrl}/liff/karte?lid=${encodeURIComponent(lid)}&sc=${encodeURIComponent(sc)}`
      } else {
        // 顧客チェックインフロー: GPS取得 → /api/karte/check
        setMessage('位置情報を確認中...')
        const coords = await getUserCoords()

        setMessage('お客様情報を確認中...')
        const res = await fetch('/api/karte/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineUserId: lid,
            lat: coords.lat,
            lng: coords.lng,
          }),
        })
        const data = await res.json()

        // ジオフェンス失敗 → 専用エラー表示
        if (res.status === 403 && data?.error === 'gps_check_failed') {
          setGpsError({
            reason: data.reason,
            message: data.message,
            distanceMeters: data.distanceMeters,
            radiusMeters: data.radiusMeters,
          })
          setMessage('')
          return
        }
        if (!res.ok) throw new Error(data.error || '確認に失敗しました')

        // 新規顧客の場合は座標を register ページへ引き継ぐ（GPS二重ゲート用）
        const base = `lid=${encodeURIComponent(lid)}&dn=${encodeURIComponent(dn)}`
        const coordsParam =
          coords.lat != null && coords.lng != null
            ? `&lat=${coords.lat}&lng=${coords.lng}`
            : ''
        if (!data.exists) {
          targetUrl = `${appUrl}/liff/register?${base}${coordsParam}`
        } else if (mode === 'concept') {
          targetUrl = `${appUrl}/liff/concept?${base}&cid=${encodeURIComponent(data.customerId || '')}`
        } else if (data.needsConcept) {
          targetUrl = `${appUrl}/liff/concept?${base}&cid=${encodeURIComponent(data.customerId || '')}`
        } else {
          targetUrl = `${appUrl}/liff/thanks?${base}`
        }
      }

      setHandoffUrl(targetUrl)
      setMessage('読み込み中...')
      try {
        window.location.href = targetUrl
      } catch (e) {
        console.error('navigation failed', e)
      }
    },
    [searchParams]
  )

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (!liffId) {
      setError('LIFF_IDが設定されていません')
      return
    }

    const run = async () => {
      try {
        await liff.init({ liffId })
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return
        }
        const profile = await liff.getProfile()
        const lid = profile.userId
        const dn = profile.displayName || ''

        // スタッフ用モードは判定スキップ
        const mode = searchParams?.get('mode')
        if (mode === 'timecard' || mode === 'karte') {
          await proceedAfterAuth(lid, dn)
          return
        }

        // ブロック状態を確認（未追加はAggressiveが処理済みなので無視）
        setMessage('LINE友だち状態を確認中...')
        try {
          const res = await fetch('/api/check-friendship', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lineUserId: lid }),
          })
          const data = await res.json()
          if (data.isBlocked) {
            setBlockedGate({
              friendAddUrl: data.friendAddUrl || window.location.href,
            })
            setMessage('')
            return
          }
        } catch (e) {
          console.warn('[welcome] check-friendship failed (non-blocking):', e)
        }

        await proceedAfterAuth(lid, dn)
      } catch (err) {
        console.error('LIFF welcome error:', err)
        setError(err instanceof Error ? err.message : '初期化に失敗しました')
      }
    }
    run()
  }, [searchParams, proceedAfterAuth])

  // === ジオフェンス検証エラー（店舗外/位置情報不可） ===
  if (gpsError) {
    const isPermissionIssue = gpsError.reason === 'gps_unavailable'
    return (
      <main
        className="bg-gradient-to-b from-rose-50 to-white flex items-center justify-center px-6 py-10"
        style={{ minHeight: '100dvh' }}
      >
        <div className="max-w-sm w-full bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center">
          <div className="h-14 w-14 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center">
            <MapPinOff className="h-7 w-7 text-rose-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {isPermissionIssue ? '位置情報の許可が必要です' : '店舗内でアクセスしてください'}
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-6 whitespace-pre-line">
            {gpsError.message}
          </p>
          {gpsError.distanceMeters != null && gpsError.radiusMeters != null && (
            <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-xs text-rose-700">
              現在地まで {gpsError.distanceMeters}m / 許容 {gpsError.radiusMeters}m
            </div>
          )}
          <a
            href={typeof window !== 'undefined' ? window.location.href : '#'}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-stone-900 text-white font-semibold no-underline active:opacity-80"
          >
            <RefreshCw className="h-5 w-5" />
            再試行
          </a>
          <p className="mt-6 text-xs text-gray-400 leading-relaxed">
            {isPermissionIssue
              ? 'iPhone は「設定 > プライバシー > 位置情報サービス」、Android は「設定 > 位置情報」をオンにしてください。'
              : 'お店の中で再度QRコードを読み取るか、上のボタンから再読み込みしてください。'}
          </p>
        </div>
      </main>
    )
  }

  // === ブロック中ユーザー向けゲート ===
  if (blockedGate) {
    return (
      <main
        className="bg-gradient-to-b from-amber-50 to-white flex items-center justify-center px-6 py-10"
        style={{ minHeight: '100dvh' }}
      >
        <div className="max-w-sm w-full bg-white rounded-2xl border border-amber-200 shadow-sm p-8 text-center">
          <div className="h-14 w-14 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <UserPlus className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            公式LINEのブロックを解除してください
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            ご予約確認・アンケート・お知らせを
            <br />
            公式LINEでお送りしています。
            <br />
            下のボタンから公式LINEを開き、
            <br />
            「ブロック解除」または「友だち追加」を
            <br />
            実施してください。
          </p>

          <a
            href={blockedGate.friendAddUrl}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#06C755] text-white font-semibold no-underline active:opacity-80"
          >
            <UserPlus className="h-5 w-5" />
            公式LINEを開く
          </a>

          <div className="mt-4">
            <a
              href={typeof window !== 'undefined' ? window.location.href : '#'}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 underline underline-offset-2"
            >
              <RefreshCw className="h-4 w-4" />
              解除後こちら（再読込）
            </a>
          </div>

          <p className="mt-6 text-xs text-gray-400 leading-relaxed">
            ブロック中はLINEメッセージが届かないため、
            <br />
            サービスをご利用いただけません。
          </p>
        </div>
      </main>
    )
  }

  // === エラー ===
  if (error) {
    return (
      <main
        className="bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6"
        style={{ minHeight: '100dvh' }}
      >
        <div className="max-w-sm w-full bg-white rounded-2xl border border-red-200 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-700 mb-2">エラー</h2>
          <p className="text-sm text-gray-600 mb-6 whitespace-pre-wrap">{error}</p>
          <a
            href={typeof window !== 'undefined' ? window.location.href : '#'}
            className="inline-block px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium no-underline"
          >
            もう一度試す
          </a>
        </div>
      </main>
    )
  }

  // === ローディング ===
  return (
    <main
      className="bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6"
      style={{ minHeight: '100dvh' }}
    >
      <div className="max-w-sm w-full text-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600 mx-auto mb-4" />
        <p className="text-sm text-gray-700 font-semibold mb-2">{message}</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          ブラウザが自動で開かない場合は
          <br />
          下のボタンから続行してください
        </p>
        {handoffUrl && (
          <a
            href={handoffUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold"
          >
            <ExternalLink className="h-4 w-4" />
            ブラウザで開く
          </a>
        )}
      </div>
    </main>
  )
}
