'use client'

import { useState, useEffect, Suspense } from 'react'
import { login } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Scissors, ArrowLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// エラーコードからメッセージへの変換
function getErrorMessage(code: string): string {
  switch (code) {
    case 'line_cancelled': return 'LINEログインがキャンセルされました'
    case 'invalid_request': return 'LINEログインのリクエストが不正です'
    case 'invalid_state': return 'セキュリティ検証に失敗しました。もう一度お試しください'
    case 'token_failed': return 'LINEトークンの取得に失敗しました'
    case 'profile_failed': return 'LINEプロフィールの取得に失敗しました'
    case 'not_linked': return 'LINE連携されたスタッフが見つかりません。先にマイ実績ページからLINE連携を行ってください'
    case 'session_failed': return 'セッションの作成に失敗しました'
    case 'config_error': return 'サーバー設定エラーです。管理者にお問い合わせください'
    case 'server_error': return 'サーバーエラーが発生しました'
    default: return 'ログインに失敗しました'
  }
}

function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lineLoading, setLineLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || ''

  const hasLineLogin = !!process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID

  // OAuth2コールバック処理: token_hash がURLにある場合、Supabaseセッションを作成
  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const errorCode = searchParams.get('error')

    if (errorCode) {
      setError(getErrorMessage(errorCode))
      // URLからerrorパラメータを除去
      window.history.replaceState({}, '', '/login')
      return
    }

    if (tokenHash && type === 'magiclink') {
      setLineLoading(true)
      setError(null)

      const verifySession = async () => {
        try {
          const supabase = createClient()
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
          })

          if (otpError) {
            setError('セッションの作成に失敗しました')
            setLineLoading(false)
            window.history.replaceState({}, '', '/login')
            return
          }

          // next が指定されていればそこへ、なければデフォルト
          router.push(nextPath || '/staff/visit-log')
        } catch {
          setError('LINEログイン処理中にエラーが発生しました')
          setLineLoading(false)
          window.history.replaceState({}, '', '/login')
        }
      }

      verifySession()
    }
  }, [searchParams, router])

  // LINEログイン: OAuth2フローへリダイレクト
  function handleLineLogin() {
    setLineLoading(true)
    setError(null)
    // サーバー側でLINE OAuth URLを構築してリダイレクト
    window.location.href = '/api/auth/line-redirect'
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* モバイル用ロゴ */}
      <div className="lg:hidden text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gray-900 mb-4">
          <Scissors className="h-7 w-7 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">COOKIE 熊本</h1>
        <p className="text-sm text-gray-500 mt-1">顧客管理・リピート促進CRM</p>
      </div>

      {/* デスクトップ用タイトル */}
      <div className="hidden lg:block mb-8">
        <h2 className="text-2xl font-bold text-gray-900">ログイン</h2>
        <p className="text-sm text-gray-500 mt-1">
          アカウント情報を入力してください
        </p>
      </div>

      {/* LINEログインボタン */}
      {hasLineLogin && (
        <>
          <Button
            type="button"
            onClick={handleLineLogin}
            disabled={lineLoading}
            className="w-full h-12 text-white font-bold text-base hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            {lineLoading ? (
              'LINE認証中...'
            ) : (
              <span className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                LINEでログイン
              </span>
            )}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-50 px-3 text-gray-500">または</span>
            </div>
          </div>
        </>
      )}

      <form action={handleSubmit} className="space-y-5">
        {nextPath && <input type="hidden" name="next" value={nextPath} />}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            メールアドレス
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="staff@cookie-for-men.com"
            className="h-11 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            パスワード
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="パスワードを入力"
            className="h-11 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500"
          />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium"
          disabled={loading}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link
          href="/reset-password"
          className="text-sm text-gray-500 hover:text-amber-600 transition-colors"
        >
          パスワードを忘れた方はこちら
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        アカウントは管理者が作成します
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* 左パネル: ブランディング */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-amber-500 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-amber-600 blur-3xl" />
        </div>
        <div className="relative flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-amber-600/20 border border-amber-600/30 flex items-center justify-center">
              <Scissors className="h-6 w-6 text-amber-500" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-wide">COOKIE 熊本</h1>
          </div>
          <p className="text-xl text-gray-300 mb-3 font-medium">
            リピートを、仕組みにする。
          </p>
          <p className="text-gray-500 leading-relaxed max-w-md">
            顧客の来店周期を管理し、最適なタイミングでLINEを自動配信するメンズ美容室専用CRMシステム
          </p>

          <div className="mt-16 space-y-6">
            <FeatureItem label="施術ログ入力だけでOK" />
            <FeatureItem label="LINE自動配信でリピート促進" />
            <FeatureItem label="コホート分析でPDCA改善" />
          </div>
        </div>
      </div>

      {/* 右パネル: ログインフォーム */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="px-6 pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            トップに戻る
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <Suspense fallback={<div className="w-full max-w-sm text-center text-gray-400">読み込み中...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <footer className="py-4 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} COOKIE 熊本
        </footer>
      </div>
    </div>
  )
}

function FeatureItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-amber-600/30 flex items-center justify-center flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
      </div>
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
  )
}
