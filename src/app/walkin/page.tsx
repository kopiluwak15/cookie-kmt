'use client'

// Guest Registration（スマホ/LINE非連携）は /liff/register と同じカルテ作成フローを使う。
// LINE userId なしでPOSTされ、同じ9ステップ→コンセプトアンケート遷移に対応。
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function WalkinRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/liff/register')
  }, [router])
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
    </main>
  )
}
