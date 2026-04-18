'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Eye, EyeOff, Check, Lock, ShieldCheck, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import {
  isAdminPinConfigured,
  setAdminPin,
} from '@/actions/admin-security'

const EMPLOYMENT_PASSWORD_KEY = 'employment_password'
const DEFAULT_EMPLOYMENT_PASSWORD = 'cookie2024'

export default function SystemSettingsPage() {
  // 雇用形態パスワード
  const [empPassword, setEmpPassword] = useState('')
  const [empPasswordConfirm, setEmpPasswordConfirm] = useState('')
  const [showEmpPassword, setShowEmpPassword] = useState(false)

  // 管理者PIN (削除・編集用)
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPinConfirm, setNewPinConfirm] = useState('')
  const [savingPin, setSavingPin] = useState(false)

  useEffect(() => {
    isAdminPinConfigured()
      .then(setPinConfigured)
      .catch(() => setPinConfigured(false))
  }, [])

  const handleSavePin = async () => {
    if (!newPin || !/^\d{4,10}$/.test(newPin)) {
      toast.error('PINは4〜10桁の数字で指定してください')
      return
    }
    if (newPin !== newPinConfirm) {
      toast.error('PINの確認が一致しません')
      return
    }
    if (pinConfigured && !currentPin) {
      toast.error('現在のPINを入力してください')
      return
    }

    setSavingPin(true)
    try {
      const result = await setAdminPin(newPin, pinConfigured ? currentPin : undefined)
      if (result.success) {
        toast.success('管理者PINを保存しました')
        setPinConfigured(true)
        setCurrentPin('')
        setNewPin('')
        setNewPinConfirm('')
      } else {
        toast.error(result.error || '保存に失敗しました')
      }
    } finally {
      setSavingPin(false)
    }
  }

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

      {/* 管理者PIN (削除・編集用) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-600" />
            管理者PIN（削除・編集用）
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            ログ未入力の削除など、影響の大きい操作時に入力を求めるPINです。
            4〜10桁の数字で設定してください。今後、削除・編集操作全般で使用されます。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {pinConfigured === null ? (
            <p className="text-xs text-muted-foreground">状態を確認中...</p>
          ) : pinConfigured ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-2">
              <ShieldCheck className="h-4 w-4" />
              PINは設定済みです。変更する場合は現在のPINを入力してください。
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
              <ShieldAlert className="h-4 w-4" />
              PIN未設定です。先に登録してください（登録しないと削除ボタンは動作しません）。
            </div>
          )}

          {pinConfigured && (
            <div className="space-y-2">
              <Label htmlFor="current-pin">現在のPIN</Label>
              <Input
                id="current-pin"
                type="password"
                inputMode="numeric"
                pattern="\d*"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="現在のPIN"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-pin">新しいPIN（4〜10桁）</Label>
            <Input
              id="new-pin"
              type="password"
              inputMode="numeric"
              pattern="\d*"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="新しいPIN"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pin-confirm">新しいPIN（確認）</Label>
            <Input
              id="new-pin-confirm"
              type="password"
              inputMode="numeric"
              pattern="\d*"
              value={newPinConfirm}
              onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, ''))}
              placeholder="もう一度入力"
            />
          </div>

          <Button onClick={handleSavePin} disabled={savingPin}>
            <Check className="h-4 w-4 mr-2" />
            {savingPin ? '保存中...' : pinConfigured ? 'PINを変更' : 'PINを設定'}
          </Button>
        </CardContent>
      </Card>

      {/* ログインパスワードについての案内 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ログインパスワード</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            スタッフ自身のログインパスワードは「マイページ」から変更可能です。
            アカウント追加・削除はスタッフ管理ページから行ってください。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
