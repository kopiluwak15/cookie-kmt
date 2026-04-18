'use client'

import { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Lock } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  /** 確認ボタン押下時。PINを受け取り、Promiseで成功/失敗を返す。エラーメッセージ文字列が返るとダイアログ内に表示。 */
  onConfirm: (pin: string) => Promise<{ success?: boolean; error?: string }>
  confirmLabel?: string
  confirmClassName?: string
}

/**
 * 削除・編集系の操作にPIN認証を要求する共通ダイアログ。
 *
 * - 4〜10桁の数字を入力
 * - Enter で送信
 * - 認証失敗時はダイアログ内にエラー表示（閉じない）
 * - 認証成功時は自動で閉じる
 */
export function PinDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = '実行',
  confirmClassName = 'bg-red-600 hover:bg-red-700 text-white',
}: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ダイアログが開く度にリセット
  useEffect(() => {
    if (open) {
      setPin('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!pin || !/^\d{4,10}$/.test(pin)) {
      setError('PINは4〜10桁の数字で入力してください')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await onConfirm(pin)
      if (res.success) {
        onOpenChange(false)
      } else {
        setError(res.error || 'PIN認証に失敗しました')
      }
    } catch (e) {
      const err = e as Error
      setError(err.message || 'エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-600" />
            {title}
          </AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        <div className="space-y-2 pt-2">
          <Label htmlFor="pin-input">管理者PIN</Label>
          <Input
            id="pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d*"
            autoFocus
            value={pin}
            placeholder="4〜10桁の数字"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
            disabled={submitting}
          />
          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            PIN未設定または忘れた場合は「設定 → システム設定」で確認・変更してください。
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={submitting}
            className={confirmClassName}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                実行中...
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
