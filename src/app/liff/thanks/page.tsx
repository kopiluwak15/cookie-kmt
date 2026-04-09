'use client'

// 既存顧客の Check IN 完了画面（外部ブラウザで表示）
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

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
        <p className="text-xs text-stone-400 mt-8">COOKIE 熊本</p>
      </div>
    </main>
  )
}
