'use client'

// LIFF は「LINE認証」と「友だち追加状態の最終確認」に使用する。
//
// 方針（最小構成）:
//   1. LINE Developers Console の LIFF「友だち追加オプション」を
//      Aggressive に設定しておく → LINE 側が自動で友だち追加画面を出す。
//   2. それでもスルーされる端末があるため、保険として サーバー側で
//      /api/check-friendship を呼び、友だち未追加なら先に進ませない。
//   3. Android LINE 内蔵ブラウザは <button onClick> が不発な事例があるため、
//      友だち追加ボタンは必ず <a href> で実装する。

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import liff from '@line/liff'
import { Loader2, ExternalLink, AlertCircle, UserPlus, RefreshCw } from 'lucide-react'

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
  // 友だち未追加の場合に表示するゲート state（API から URL を受け取る）
  const [friendGate, setFriendGate] = useState<{
    lid: string
    dn: string
    friendAddUrl: string
  } | null>(null)

  // ID取得後 → カルテ判定 → 次画面へ遷移する共通処理
  const proceedAfterFriend = useCallback(
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

  // LINE 認証 → 友だち判定（サーバー側） → 次処理
  const runAuthAndCheck = useCallback(async () => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (!liffId) {
      setError('LIFF_IDが設定されていません')
      return
    }

    try {
      setError('')
      setFriendGate(null)
      setMessage('LINE認証中...')

      await liff.init({ liffId })
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href })
        return
      }

      const profile = await liff.getProfile()
      const lid = profile.userId
      const dn = profile.displayName || ''

      // timecard / karte（スタッフ用）は友だち判定をスキップ
      const mode = searchParams?.get('mode')
      if (mode === 'timecard' || mode === 'karte') {
        await proceedAfterFriend(lid, dn)
        return
      }

      // サーバーサイドで友だち状態を確認
      setMessage('友だち追加状態を確認中...')
      const res = await fetch('/api/check-friendship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId: lid }),
      })
      const data = await res.json()

      if (!data.isFriend) {
        // 友だち未追加 → ゲート表示（JS に頼らず <a href> で離脱）
        const friendAddUrl =
          data.friendAddUrl ||
          process.env.NEXT_PUBLIC_LINE_FRIEND_URL ||
          window.location.href
        setFriendGate({ lid, dn, friendAddUrl })
        setMessage('')
        return
      }

      await proceedAfterFriend(lid, dn)
    } catch (err) {
      console.error('LIFF welcome error:', err)
      setError(err instanceof Error ? err.message : '初期化に失敗しました')
    }
  }, [searchParams, proceedAfterFriend])

  useEffect(() => {
    runAuthAndCheck()
  }, [runAuthAndCheck])

  // === 友だち未追加ゲート ===
  if (friendGate) {
    return (
      <main
        className="bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-6 py-10"
        style={{ minHeight: '100dvh' }}
      >
        <div className="max-w-sm w-full bg-white rounded-2xl border border-green-200 shadow-sm p-8 text-center">
          <div className="h-14 w-14 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <UserPlus className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            公式LINEの友だち追加が必要です
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            ご予約・来店特典・お知らせを公式LINEでお届けします。
            <br />
            下のボタンから友だち追加を行い、追加後に「追加済みの方はこちら」を押してください。
          </p>

          {/* 友達追加ボタン: Androidでも確実に動くよう <a href> */}
          <a
            href={friendGate.friendAddUrl}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#06C755] text-white font-semibold no-underline active:opacity-80"
          >
            <UserPlus className="h-5 w-5" />
            友だち追加する
          </a>

          <div className="mt-4">
            {/* 追加後に再チェック: <a> で自分自身を reload することで onClick に依存しない */}
            <a
              href={typeof window !== 'undefined' ? window.location.href : '#'}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 underline underline-offset-2"
            >
              <RefreshCw className="h-4 w-4" />
              追加済みの方はこちら（再読み込み）
            </a>
          </div>

          <p className="mt-6 text-xs text-gray-400 leading-relaxed">
            友だち追加しないとサービスをご利用いただけません。
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
