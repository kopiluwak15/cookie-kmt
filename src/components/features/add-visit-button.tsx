'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { addVisitRecord } from '@/actions/visit-log'
import { PinDialog } from '@/components/features/pin-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export function AddVisitButton({
  customerId,
  customerName,
}: {
  customerId: string
  customerName: string
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [visitDate, setVisitDate] = useState('')
  const [staffName, setStaffName] = useState('')
  const [serviceMenu, setServiceMenu] = useState('')
  const router = useRouter()

  async function handleAddWithPin(pin: string) {
    if (!visitDate) {
      return { error: '来店日を入力してください' }
    }

    const result = await addVisitRecord({
      customerId,
      visitDate,
      staffName: staffName || undefined,
      serviceMenu: serviceMenu || undefined,
      pin,
    })

    if (result.success) {
      toast.success(`${visitDate}の来店履歴を追加しました`)
      setFormOpen(false)
      setVisitDate('')
      setStaffName('')
      setServiceMenu('')
      router.refresh()
      return { success: true }
    }
    return { error: result.error || '追加に失敗しました' }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setFormOpen(true)}
        className="gap-2"
      >
        <PlusIcon className="h-4 w-4" />
        来店履歴を追加
      </Button>

      {/* フォーム入力ダイアログ */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>来店履歴を追加</DialogTitle>
            <DialogDescription>
              {customerName}の来店履歴を後から登録します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="visit-date">来店日 *</Label>
              <Input
                id="visit-date"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-name">担当スタッフ（オプション）</Label>
              <Input
                id="staff-name"
                type="text"
                placeholder="山田太郎"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-menu">施術メニュー（オプション）</Label>
              <Input
                id="service-menu"
                type="text"
                placeholder="縮毛矯正"
                value={serviceMenu}
                onChange={(e) => setServiceMenu(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              キャンセル
            </Button>
            <Button
              disabled={!visitDate}
              onClick={() => {
                setFormOpen(false)
                setPinOpen(true)
              }}
            >
              追加
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PIN認証ダイアログ */}
      <PinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        title="管理者PIN認証"
        description={
          <>
            <span className="font-medium text-foreground">
              {visitDate}（{customerName}）
            </span>
            <br />
            <span className="text-sm text-muted-foreground">
              来店履歴を追加するには管理者PINが必要です
            </span>
          </>
        }
        onConfirm={handleAddWithPin}
        confirmLabel="追加する"
      />
    </>
  )
}
