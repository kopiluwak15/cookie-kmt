'use client'

import { useState, useEffect, Suspense } from 'react'
import { requestPasswordReset, resetPassword } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Scissors, Mail, KeyRound, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'email' | 'set' | 'sent'>('email')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // リカバリーセッションの確認
  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()

      // code パラメータがある場合はセッション交換
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          setMode('set')
        }
        setChecking(false)
        window.history.replaceState({}, '', '/reset-password')
        return
      }

      // 既存のリカバリーセッションを確認
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setMode('set')
      }
      setChecking(false)
    }
    checkSession()
  }, [searchParams])

  async function handleRequestReset(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await requestPasswordReset(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setMode('sent')
    }
    setLoading(false)
  }

  async function handleResetPassword(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await resetPassword(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="text-center text-gray-400">読み込み中...</div>
    )
  }

  // メール送信完了
  if (mode === 'sent') {
    return (
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-green-100 mb-4">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">メール送信完了</h1>
          <p className="text-sm text-gray-500 mt-2">
            パスワードリセット用のメールを送信しました。<br />
            メール内のリンクをクリックしてパスワードを再設定してください。
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 mb-6">
          メールが届かない場合は、迷惑メールフォルダをご確認ください。
        </div>

        <Link href="/login">
          <Button variant="outline" className="w-full h-11">
            ログインに戻る
          </Button>
        </Link>
      </div>
    )
  }

  // パスワード再設定フォーム
  if (mode === 'set') {
    return (
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gray-900 mb-4">
            <Scissors className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">パスワード再設定</h1>
          <p className="text-sm text-gray-500 mt-2">
            新しいパスワードを設定してください
          </p>
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 text-amber-600">
            <KeyRound className="h-5 w-5" />
            <span className="text-sm font-medium">新しいパスワード</span>
          </div>

          <form action={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password" className="text-sm font-medium text-gray-700">
                新しいパスワード
              </Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                required
                minLength={6}
                placeholder="6文字以上"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password" className="text-sm font-medium text-gray-700">
                パスワード確認
              </Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={6}
                placeholder="もう一度入力"
                className="h-11"
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
              {loading ? '設定中...' : 'パスワードを再設定する'}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // メールアドレス入力フォーム
  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gray-900 mb-4">
          <Scissors className="h-7 w-7 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">パスワードリセット</h1>
        <p className="text-sm text-gray-500 mt-2">
          登録されたメールアドレスに<br />リセット用リンクを送信します
        </p>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4 text-amber-600">
          <Mail className="h-5 w-5" />
          <span className="text-sm font-medium">メールアドレスを入力</span>
        </div>

        <form action={handleRequestReset} className="space-y-4">
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
              className="h-11"
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
            {loading ? '送信中...' : 'リセットメールを送信'}
          </Button>
        </form>
      </div>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
          ← ログインに戻る
        </Link>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<div className="text-center text-gray-400">読み込み中...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
