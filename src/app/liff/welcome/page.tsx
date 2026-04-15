'use client'

// LIFFは「LINE認証」のみに使用する。
// 友だち追加は LIFF の「友だち追加オプション (Aggressive)」により、
// LINE 側が自動で「許可する → 友だち追加 → このページ」を実行するため、
// 本アプリでは友だち追加ゲートを持たない（cookie-crm と同じ動線）。
//
// 友だち状態の DB 反映（line_friend_date）は
// /api/check-friendship をバックグラウンドで呼ぶことで担保する。
// 判定はブロックしない（Aggressive が稀にスキップされても UX を優先）。

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import liff from '@line/liff'
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react'

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

  // ID取得後 → カルテ判定 → 次画面へ遷移する共通処理
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
        setMessage('お客様情報を確認中...')
        const res = await fetch('/api/karte/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineUserId: lid }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '確認に失敗しました')

        const base = `lid=${encodeURIComponent(lid)}&dn=${encodeURIComponent(dn)}`
        if (!data.exists) {
          targetUrl = `${appUrl}/liff/register?${base}`
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

        // 非ブロッキングで友だち状態を DB に反映（line_friend_date 更新）
        // Aggressive 経由で追加された友達をサーバー側で確定させる用途。
        // 失敗しても UX には影響させない。
        const mode = searchParams?.get('mode')
        if (mode !== 'timecard' && mode !== 'karte') {
          fetch('/api/check-friendship', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lineUserId: lid }),
          }).catch((e) => console.warn('[welcome] check-friendship failed', e))
        }

        await proceedAfterAuth(lid, dn)
      } catch (err) {
        console.error('LIFF welcome error:', err)
        setError(err instanceof Error ? err.message : '初期化に失敗しました')
      }
    }
    run()
  }, [searchParams, proceedAfterAuth])

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
