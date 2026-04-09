'use client'

// LIFFは「LINE認証のみ」に使用し、取得したユーザーIDを付けて
// 外部ブラウザへ引き継ぐ（liff.openWindow external:true）。
// 以降のカルテ作成・アンケート・タイムカードはすべて通常ブラウザで動作する。

import { Suspense, useEffect, useState } from 'react'
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
          } else if (data.needsConcept) {
            targetUrl = `${appUrl}/liff/concept?${base}&cid=${encodeURIComponent(data.customerId || '')}`
          } else {
            targetUrl = `${appUrl}/liff/thanks?${base}`
          }
        }

        setHandoffUrl(targetUrl)
        setMessage('ブラウザに切り替えます...')

        // LINE内ブラウザから外部ブラウザ（Safari/Chrome）へ引き継ぐ
        try {
          liff.openWindow({ url: targetUrl, external: true })
        } catch (e) {
          console.error('openWindow failed', e)
        }

        // 少し待ってから LIFF を閉じる（LINE内）
        setTimeout(() => {
          try {
            if (liff.isInClient && liff.isInClient()) {
              liff.closeWindow()
            }
          } catch {
            // noop
          }
        }, 800)
      } catch (err) {
        console.error('LIFF welcome error:', err)
        setError(err instanceof Error ? err.message : '初期化に失敗しました')
      }
    }
    run()
  }, [searchParams])

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
