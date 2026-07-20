'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { PlusIcon, Loader2 } from 'lucide-react'
import { addVisitRecord, getStaffForVisitLog } from '@/actions/visit-log'
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

type Staff = { id: string; name: string; is_active: boolean }

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
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [serviceMenu, setServiceMenu] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const router = useRouter()

  const loadStaff = useCallback(async () => {
    setStaffLoading(true)
    try {
      const staff = await getStaffForVisitLog()
      setStaffList(staff as Staff[])
    } catch {
      toast.error('スタッフ一覧の取得に失敗しました')
    } finally {
      setStaffLoading(false)
    }
  }, [])

  useEffect(() => {
    if (formOpen && staffList.length === 0) {
      loadStaff()
    }
  }, [formOpen, staffList.length, loadStaff])

  const canSubmit = !!visitDate && !!staffName && !!serviceMenu.trim()

  async function handleAddWithPin(pin: string) {
    const result = await addVisitRecord({
      customerId,
      visitDate,
      staffName,
      serviceMenu: serviceMenu.trim(),
      price: price ? parseInt(price, 10) : undefined,
      notes: notes || undefined,
      pin,
    })

    if (result.success) {
      toast.success(
        `${visitDate}の来店履歴を追加しました${price ? `（¥${parseInt(price, 10).toLocaleString()}）` : ''}`
      )
      setVisitDate('')
      setStaffName('')
      setServiceMenu('')
      setPrice('')
      setNotes('')
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
        <DialogContent className="sm:max-w-[400px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>来店履歴を追加</DialogTitle>
            <DialogDescription>
              {customerName}さんの来店履歴を後から登録します（記録漏れの補完用）
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
              <Label htmlFor="staff-name">担当スタッフ *</Label>
              {staffLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  読み込み中...
                </div>
              ) : (
                <select
                  id="staff-name"
                  className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                >
                  <option value="">スタッフを選択...</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.name}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-menu">施術メニュー *</Label>
              <Input
                id="service-menu"
                type="text"
                placeholder="縮毛矯正 / カット など"
                value={serviceMenu}
                onChange={(e) => setServiceMenu(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">施術料金（円・税込 / 任意）</Label>
              <Input
                id="price"
                type="number"
                inputMode="numeric"
                placeholder="16500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                入力すると売上分析・ダッシュボードに反映されます
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visit-notes">メモ（任意）</Label>
              <Input
                id="visit-notes"
                type="text"
                placeholder="記録漏れのため後日追加 など"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              キャンセル
            </Button>
            <Button
              disabled={!canSubmit}
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
              {visitDate}（{customerName}さん / 担当: {staffName}）
            </span>
            <br />
            <span className="text-sm text-muted-foreground">
              来店履歴を追加するには管理者PINが必要です
            </span>
          </>
        }
        onConfirm={handleAddWithPin}
        confirmLabel="追加する"
        confirmClassName="bg-primary hover:bg-primary/90 text-primary-foreground"
      />
    </>
  )
}
