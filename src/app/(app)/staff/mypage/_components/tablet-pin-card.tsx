'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tablet, Check, ShieldCheck, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { setMyTabletPin } from '@/actions/timecard-kiosk'

interface Props {
  hasPin: boolean
}

export function TabletPinCard({ hasPin: initialHasPin }: Props) {
  const [hasPin, setHasPin] = useState(initialHasPin)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPinConfirm, setNewPinConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!/^[a-zA-Z0-9]{4,8}$/.test(newPin)) {
      toast.error('PINは4〜8文字の英数字です')
      return
    }
    if (newPin !== newPinConfirm) {
      toast.error('PIN（確認）が一致しません')
      return
    }
    if (hasPin && !currentPin) {
      toast.error('現在のPINを入力してください')
      return
    }

    setSaving(true)
    const res = await setMyTabletPin(newPin, hasPin ? currentPin : undefined)
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('タブレット打刻PINを保存しました')
    setHasPin(true)
    setCurrentPin('')
    setNewPin('')
    setNewPinConfirm('')
  }

  return (
    <Card className="border-emerald-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tablet className="h-5 w-5 text-emerald-600" />
          タブレット打刻PIN
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          携帯を忘れたときに、店舗の共有タブレットから打刻するための個人PINです（4〜8文字英数字）。
          ログインパスワードとは別のPINを設定してください。
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasPin ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-2">
            <ShieldCheck className="h-4 w-4" />
            PIN設定済み
            <Badge variant="outline" className="ml-auto text-[10px]">変更可能</Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
            <ShieldAlert className="h-4 w-4" />
            PIN未設定（タブレット打刻ができません）
          </div>
        )}

        {hasPin && (
          <div className="space-y-1.5">
            <Label htmlFor="cur-pin" className="text-xs">現在のPIN</Label>
            <Input
              id="cur-pin"
              type="password"
              autoComplete="off"
              value={currentPin}
              onChange={(e) =>
                setCurrentPin(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8))
              }
              placeholder="変更する場合"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="new-pin" className="text-xs">新しいPIN（4〜8文字 英数字）</Label>
          <Input
            id="new-pin"
            type="password"
            autoComplete="new-password"
            value={newPin}
            onChange={(e) =>
              setNewPin(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8))
            }
            placeholder="新しいPIN"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-pin-c" className="text-xs">新しいPIN（確認）</Label>
          <Input
            id="new-pin-c"
            type="password"
            autoComplete="new-password"
            value={newPinConfirm}
            onChange={(e) =>
              setNewPinConfirm(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8))
            }
            placeholder="もう一度入力"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          <Check className="h-4 w-4 mr-1.5" />
          {saving ? '保存中...' : hasPin ? 'PINを変更' : 'PINを設定'}
        </Button>

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          ※ タブレット打刻は応急処置です。常用すると指導対象となるため、原則はLINEから打刻してください。
        </p>
      </CardContent>
    </Card>
  )
}
