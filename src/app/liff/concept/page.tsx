'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  ConceptSurveyForm,
  type ConceptSurveyPayload,
} from '@/components/features/concept-survey-form'

export default function ConceptSurveyPage() {
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
      <ConceptSurveyInner />
    </Suspense>
  )
}

function ConceptSurveyInner() {
  const searchParams = useSearchParams()

  const submit = async (payload: ConceptSurveyPayload) => {
    const lineUserId =
      searchParams?.get('lid') ||
      (typeof window !== 'undefined' ? sessionStorage.getItem('liff_line_user_id') : null)
    const customerId =
      searchParams?.get('cid') ||
      (typeof window !== 'undefined' ? sessionStorage.getItem('liff_customer_id') : null)

    const res = await fetch('/api/karte/concept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineUserId,
        customerId,
        ...payload,
      }),
    })
    const json = await res.json()
    if (!res.ok || !json.ok) throw new Error(json.error || '送信に失敗しました')
  }

  return <ConceptSurveyForm onSubmit={submit} storageKey="liff_concept_draft_v1" />
}
