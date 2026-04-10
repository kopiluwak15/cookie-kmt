'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  ConceptSurveyForm,
  type ConceptSurveyPayload,
} from '@/components/features/concept-survey-form'

export default function CounselingFillPage() {
  return (
    <Suspense
      fallback={
        <main
          className="bg-gray-50 flex items-center justify-center"
          style={{ minHeight: '100dvh' }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </main>
      }
    >
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') || ''

  if (!token) {
    return (
      <main
        className="bg-gray-50 flex items-center justify-center px-6"
        style={{ minHeight: '100dvh' }}
      >
        <div className="max-w-md text-center">
          <p className="text-sm text-gray-700">
            アンケートリンクが正しくありません。
            <br />
            お手数ですがスタッフまでお声がけください。
          </p>
        </div>
      </main>
    )
  }

  const submit = async (payload: ConceptSurveyPayload) => {
    const res = await fetch('/api/public/counseling/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...payload }),
    })
    const json = await res.json()
    if (!res.ok || !json.ok) {
      if (json.error === 'invalid_or_expired_token') {
        throw new Error('リンクの有効期限が切れています。スタッフまでお声がけください。')
      }
      throw new Error(json.error || '送信に失敗しました')
    }
  }

  // ドラフトキーをトークンごとに分離（複数顧客が同じ端末を使う想定はないが念のため）
  return (
    <ConceptSurveyForm
      onSubmit={submit}
      storageKey={`counseling_draft_${token.slice(-12)}`}
    />
  )
}
