'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Eye, EyeOff, Check } from 'lucide-react'
import { toast } from 'sonner'

const EMPLOYMENT_PASSWORD_KEY = 'employment_password'
const DEFAULT_EMPLOYMENT_PASSWORD = 'cookie2024'

export default function SystemSettingsPage() {
  // 雇用形態パスワード
  const [empPassword, setEmpPassword] = useState('')
  const [empPasswordConfirm, setEmpPasswordConfirm] = useState('')
  const [showEmpPassword, setShowEmpPassword] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(EMPLOYMENT_PASSWORD_KEY)
    if (saved) setEmpPassword(saved)
    else setEmpPassword(DEFAULT_EMPLOYMENT_PASSWORD)
  }, [])

  const handleSaveEmpPassword = () => {
    if (!empPassword) {
      toast.error('パスワードを入力してください')
      return
    }
    if (empPassword !== empPasswordConfirm && empPasswordConfirm !== '') {
      toast.error('パスワードが一致しません')
      return
    }
    localStorage.setItem(EMPLOYMENT_PASSWORD_KEY, empPassword)
    toast.success('雇用形態パスワードを保存しました')
    setEmpPasswordConfirm('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          システム設定
        </h2>
        <p className="text-muted-foreground mt-1">各種パスワードやシステム設定を管理します</p>
      </div>

      {/* 雇用形態ページ パスワード */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">雇用形態ページ パスワード</CardTitle>
          <p className="text-sm text-muted-foreground">
            雇用形態ページの閲覧に必要なパスワードを設定します。
            削除パスワード（ログインパスワード）とは別のパスワードです。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emp-pass">新しいパスワード</Label>
            <div className="relative">
              <Input
                id="emp-pass"
                type={showEmpPassword ? 'text' : 'password'}
                value={empPassword}
                onChange={(e) => setEmpPassword(e.target.value)}
                placeholder="雇用形態パスワード"
              />
              <button
                type="button"
                onClick={() => setShowEmpPassword(!showEmpPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showEmpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-pass-confirm">パスワード確認</Label>
            <Input
              id="emp-pass-confirm"
              type="password"
              value={empPasswordConfirm}
              onChange={(e) => setEmpPasswordConfirm(e.target.value)}
              placeholder="もう一度入力"
            />
          </div>
          <Button onClick={handleSaveEmpPassword}>
            <Check className="h-4 w-4 mr-2" />
            保存する
          </Button>
        </CardContent>
      </Card>

      {/* 削除パスワードについての案内 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">削除・編集パスワード</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            顧客削除・施術ログ編集などの操作確認に使用するパスワードは、
            ログイン時のパスワードと同じです。変更する場合はシステム管理者にお問い合わせください。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
