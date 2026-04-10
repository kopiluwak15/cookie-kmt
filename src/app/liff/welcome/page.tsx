'use client'

// LIFFは「LINE認証のみ」に使用し、取得したユーザーIDを付けて
// 外部ブラウザへ引き継ぐ（liff.openWindow external:true）。
// 以降のカルテ作成・アンケート・タイムカードはすべて通常ブラウザで動作する。

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import liff from '@line/liff'
import { Loader2, ExternalLink, AlertCircle, UserPlus } from 'lucide-react'

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
  // 友だち追加ゲート
  const [needsFriend, setNeedsFriend] = useState(false)
  const [friendChecking, setFriendChecking] = useState(false)
  const [profileState, setProfileState] = useState<{ lid: string; dn: string } | null>(null)
  // 公式LINE友だち追加URL（DB global_settings.line_oa_basic_id から取得）
  const [friendAddUrl, setFriendAddUrl] = useState('')

  // ID取得後 → カルテ判定 → 外部ブラウザへ引き継ぐ共通処理
  const proceedAfterFriend = useCallback(async (lid: string, dn: string) => {
    const mode = searchParams?.get('mode')
    const appUrl = window.location.origin
    let targetUrl: string

    if (mode === 'timecard') {
      targetUrl = `${appUrl}/liff/timecard?lid=${encodeURIComponent(lid)}&dn=${encodeURIComponent(dn)}`
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
        // カウンセリング途中でメニューが変わった場合の強制再アンケート
        targetUrl = `${appUrl}/liff/concept?${base}&cid=${encodeURIComponent(data.customerId || '')}`
      } else if (data.needsConcept) {
        targetUrl = `${appUrl}/liff/concept?${base}&cid=${encodeURIComponent(data.customerId || '')}`
      } else {
        targetUrl = `${appUrl}/liff/thanks?${base}`
      }
    }

    setHandoffUrl(targetUrl)
    setMessage('読み込み中...')

    // LINE内（LIFF）内で画面遷移する。外部ブラウザ（Safari/Chrome）には飛ばさない
    // ※ location.href なら同じLIFFコンテキストでそのまま遷移できる
    try {
      window.location.href = targetUrl
    } catch (e) {
      console.error('navigation failed', e)
    }
  }, [searchParams])

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
          liff.login()
          return
        }
        const profile = await liff.getProfile()
        const lid = profile.userId
        const dn = profile.displayName || ''
        setProfileState({ lid, dn })

        // 公式LINE友だち追加URLを取得（失敗しても続行）
        try {
          const oaRes = await fetch('/api/public/line-oa', { cache: 'no-store' })
          const oaData = await oaRes.json()
          if (oaData?.addFriendUrl) setFriendAddUrl(oaData.addFriendUrl)
        } catch (e) {
          console.error('fetch line-oa failed', e)
        }

        // タイムカードモードは友だち追加不要（スタッフ用）
        const mode = searchParams?.get('mode')
        if (mode === 'timecard') {
          await proceedAfterFriend(lid, dn)
          return
        }

        // 友だち判定
        setMessage('友だち状態を確認中...')
        let isFriend = false
        try {
          const f = await liff.getFriendship()
          isFriend = !!f.friendFlag
        } catch (e) {
          console.error('getFriendship failed', e)
          // 取得失敗時は一旦ゲート表示してユーザーに判断させる
          isFriend = false
        }

        if (!isFriend) {
          setNeedsFriend(true)
          setMessage('')
          return
        }

        await proceedAfterFriend(lid, dn)
      } catch (err) {
        console.error('LIFF welcome error:', err)
        setError(err instanceof Error ? err.message : '初期化に失敗しました')
      }
    }
    run()
  }, [searchParams, proceedAfterFriend])

  // 「追加しました」再チェック
  const recheckFriendship = useCallback(async () => {
    if (!profileState) return
    setFriendChecking(true)
    try {
      const f = await liff.getFriendship()
      if (f.friendFlag) {
        setNeedsFriend(false)
        setMessage('確認できました。続行します...')
        await proceedAfterFriend(profileState.lid, profileState.dn)
      } else {
        setMessage('まだ友だち追加が確認できません。もう一度お試しください。')
      }
    } catch (e) {
      console.error('recheck friendship failed', e)
      setMessage('確認に失敗しました。もう一度お試しください。')
    } finally {
      setFriendChecking(false)
    }
  }, [profileState, proceedAfterFriend])

  // 友だち追加画面へ遷移
  const openFriendAdd = useCallback(() => {
    if (!friendAddUrl) {
      setError(
        '公式LINEの友だち追加URLが設定されていません。管理画面 > 設定 > LINE設定で「公式LINE ベーシックID」を登録してください。'
      )
      return
    }
    try {
      // LINE内ブラウザ内で追加画面を開く（external:false）
      liff.openWindow({ url: friendAddUrl, external: false })
    } catch (e) {
      console.error('openWindow for friend add failed', e)
      window.location.href = friendAddUrl
    }
  }, [friendAddUrl])

  // 友だち追加ゲート画面
  if (needsFriend) {
    return (
      <main
        className="bg-gradient-to-b from-amber-50 to-white flex items-center justify-center px-6"
        style={{ minHeight: '100dvh' }}
      >
        <div className="max-w-sm w-full bg-white rounded-2xl border border-amber-200 p-8 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
            <UserPlus className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            公式LINEを友だち追加してください
          </h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            お礼メッセージや次回ご来店のご案内を
            <br />
            お送りするために、公式LINEの
            <br />
            友だち追加をお願いします。
          </p>

          <button
            onClick={openFriendAdd}
            className="w-full py-3.5 rounded-xl bg-[#06C755] text-white font-bold text-base shadow-sm hover:brightness-95 active:brightness-90 transition"
          >
            ＋ 友だち追加する
          </button>

          <p className="text-xs text-gray-500 mt-4">
            追加したら下のボタンで次へ進んでください
          </p>

          <button
            onClick={recheckFriendship}
            disabled={friendChecking}
            className="mt-3 w-full py-3 rounded-xl border border-gray-300 text-gray-800 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            {friendChecking ? '確認中...' : '追加しました・次へ'}
          </button>

          {message && (
            <p className="mt-4 text-xs text-amber-700">{message}</p>
          )}
        </div>
      </main>
    )
  }

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
