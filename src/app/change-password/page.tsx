'use client'

import { useState } from 'react'
import { changePassword } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Scissors, KeyRound } from 'lucide-react'

export default function ChangePasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await changePassword(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gray-900 mb-4">
            <Scissors className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">パスワード変更</h1>
          <p className="text-sm text-gray-500 mt-2">
            セキュリティのため、初回ログイン時に<br />パスワードを変更してください
          </p>
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 text-amber-600">
            <KeyRound className="h-5 w-5" />
            <span className="text-sm font-medium">新しいパスワードを設定</span>
          </div>

          <form action={handleSubmit} className="space-y-4">
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
              {loading ? '変更中...' : 'パスワードを変更する'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          変更後、自動的にログインされます
        </p>
      </div>
    </div>
  )
}
