'use client'

// 既存顧客の Check IN 完了画面（LIFF 内ブラウザで表示）
import { Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, X } from 'lucide-react'

export default function ThanksPage() {
  return (
    <Suspense fallback={null}>
      <ThanksInner />
    </Suspense>
  )
}

function ThanksInner() {
  const searchParams = useSearchParams()
  const name = searchParams?.get('dn') || ''

  const handleClose = useCallback(async () => {
    try {
      const liff = (await import('@line/liff')).default
      if (liff.isInClient()) {
        liff.closeWindow()
        return
      }
    } catch {
      // LIFF 外の場合は何もしない
    }
    // LIFF 外（外部ブラウザ）ではウィンドウを閉じる
    window.close()
  }, [])

  return (
    <main
      className="bg-gradient-to-b from-stone-50 to-white flex items-center justify-center px-6"
      style={{ minHeight: '100dvh' }}
    >
      <div className="max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 mx-auto mb-5 flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900 mb-2">
          Check IN ありがとうございます
        </h1>
        {name && (
          <p className="text-sm text-stone-600 mb-6">{name} 様、ようこそ</p>
        )}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mt-4">
          <p className="text-sm text-stone-700 leading-relaxed">
            スタッフがお声がけするまで
            <br />
            少々お待ちください。
          </p>
        </div>
        <button
          onClick={handleClose}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 active:bg-stone-900 transition"
        >
          <X className="h-4 w-4" />
          閉じる
        </button>
        <p className="text-xs text-stone-400 mt-6">COOKIE 熊本</p>
      </div>
    </main>
  )
}
