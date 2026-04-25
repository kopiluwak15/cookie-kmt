'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

interface LineLinkButtonProps {
  isLinked: boolean
  authUserId?: string
}

export function LineLinkButton({ isLinked, authUserId }: LineLinkButtonProps) {
  const [linked, setLinked] = useState(isLinked)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const hasChannelId = !!process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID

  // コールバック結果を処理（管理者/スタッフどちらのパスでも動作）
  useEffect(() => {
    const lineLinked = searchParams.get('line_linked')
    const lineError = searchParams.get('line_error')

    if (lineLinked === '1') {
      setLinked(true)
      // URLパラメータをクリーン（現在のパスを維持）
      const cleanUrl = typeof window !== 'undefined' ? window.location.pathname : ''
      window.history.replaceState({}, '', cleanUrl)
    }

    if (lineError) {
      setError(getLineErrorMessage(lineError))
      const cleanUrl = typeof window !== 'undefined' ? window.location.pathname : ''
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [searchParams])

  if (!hasChannelId) return null

  function handleLink() {
    // OAuth2フローへリダイレクト（mode=link でLINE連携モード）
    // auth_user_id をstateに含めてCookieに依存しない
    const params = new URLSearchParams({ mode: 'link' })
    if (authUserId) params.set('uid', authUserId)
    window.location.href = `/api/auth/line-redirect?${params.toString()}`
  }

  if (linked) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>LINE連携済み</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleLink}
        className="text-white font-medium"
        style={{ backgroundColor: '#06C755' }}
      >
        LINEアカウントを連携する
      </Button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        連携するとLINEでログインできるようになります
      </p>
    </div>
  )
}

function getLineErrorMessage(code: string): string {
  switch (code) {
    case 'not_logged_in': return 'ログインが必要です。再度ログインしてください'
    case 'already_used': return 'このLINEアカウントは既に他のスタッフに紐付けられています'
    case 'update_failed': return 'LINE連携の更新に失敗しました'
    case 'token_failed': return 'LINEトークンの取得に失敗しました'
    case 'profile_failed': return 'LINEプロフィールの取得に失敗しました'
    case 'invalid_state': return 'セキュリティ検証に失敗しました。もう一度お試しください'
    case 'config_error': return 'サーバー設定エラーです。管理者にお問い合わせください'
    default: return 'LINE連携に失敗しました'
  }
}
