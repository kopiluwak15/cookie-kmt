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
  const [sellPrice, setSellPrice] = useState('')
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountAmount, setDiscountAmount] = useState('')
  const [displayName, setDisplayName] = useState('')
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
      sellPrice: sellPrice ? parseInt(sellPrice, 10) : undefined,
      discountType,
      discountAmount: discountAmount ? parseInt(discountAmount, 10) : undefined,
      displayName: displayName || undefined,
      pin,
    })

    if (result.success) {
      toast.success(`${visitDate}の来店履歴を追加しました（売上: ${sellPrice ? `¥${parseInt(sellPrice, 10).toLocaleString()}` : '-'}）`)
      setFormOpen(false)
      setVisitDate('')
      setStaffName('')
      setServiceMenu('')
      setSellPrice('')
      setDiscountAmount('')
      setDisplayName('')
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

            <div className="space-y-2">
              <Label htmlFor="display-name">請求名（オプション）</Label>
              <Input
                id="display-name"
                type="text"
                placeholder="カット + カラー"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sell-price">売価（円、税込み）</Label>
              <Input
                id="sell-price"
                type="number"
                placeholder="5500"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                min="0"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="discount-type">割引形式</Label>
                <select
                  id="discount-type"
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percent')}
                >
                  <option value="fixed">固定額（¥）</option>
                  <option value="percent">パーセント（%）</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount-amount">割引額</Label>
                <Input
                  id="discount-amount"
                  type="number"
                  placeholder={discountType === 'percent' ? '10' : '500'}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  min="0"
                />
              </div>
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
