'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// 旧 /survey は /liff/welcome に統一
export default function SurveyRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/liff/welcome')
  }, [router])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </main>
  )
}
