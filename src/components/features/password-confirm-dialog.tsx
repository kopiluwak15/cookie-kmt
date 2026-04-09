'use client'

import { useState } from 'react'
import { verifyPassword } from '@/actions/verify-password'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface PasswordConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => Promise<void>
  confirmLabel?: string
  variant?: 'destructive' | 'default'
}

export function PasswordConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = '削除する',
  variant = 'destructive',
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const handleSubmit = async () => {
    if (!password) {
      setError('パスワードを入力してください')
      return
    }

    setVerifying(true)
    setError(null)

    try {
      const result = await verifyPassword(password)
      if (!result.valid) {
        setError(result.error || 'パスワードが正しくありません')
        return
      }

      // パスワード確認成功 → 実際の削除処理
      await onConfirm()
      handleClose()
    } finally {
      setVerifying(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${variant === 'destructive' ? 'text-red-600' : ''}`}>
            {variant === 'destructive' && <AlertTriangle className="h-5 w-5" />}
            {title}
          </DialogTitle>
          <DialogDescription className="text-left">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="confirm-password">パスワードを入力して確認</Label>
            <Input
              id="confirm-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ログインパスワード"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !verifying) handleSubmit()
              }}
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={verifying}>
              キャンセル
            </Button>
            <Button
              variant={variant}
              onClick={handleSubmit}
              disabled={verifying || !password}
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  確認中...
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
