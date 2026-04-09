'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Pencil, Check } from 'lucide-react'
import { PasswordConfirmDialog } from '@/components/features/password-confirm-dialog'
import { updateVisitLog, getVisitRecord } from '@/actions/visit-log'
import { searchCustomers } from '@/actions/customers'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { StyleSetting, ServiceMenuItem } from '@/types'

interface EditVisitButtonProps {
  visitId: string
  visitDate: string
  customerName?: string
  styles: StyleSetting[]
  serviceMenus: ServiceMenuItem[]
}

export function EditVisitButton({
  visitId,
  visitDate,
  customerName,
  styles,
  serviceMenus,
}: EditVisitButtonProps) {
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  // 編集フォーム state
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string; customer_code: string; name: string
  } | null>(null)
  const [selectedMenus, setSelectedMenus] = useState<string[]>([])
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null)
  const [staffName, setStaffName] = useState('')
  const [checkinTime, setCheckinTime] = useState('')
  const [checkoutTime, setCheckoutTime] = useState('')
  const [price, setPrice] = useState('')

  // 顧客検索
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<{ id: string; customer_code: string; name: string }[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  async function handlePasswordConfirm() {
    setPasswordOpen(false)
    setLoading(true)
    try {
      const visit = await getVisitRecord(visitId)
      if (!visit) {
        toast.error('施術ログが見つかりません')
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = visit.customer as any
      setSelectedCustomer(customer ? {
        id: customer.id,
        customer_code: customer.customer_code,
        name: customer.name,
      } : null)
      setSelectedMenus(visit.service_menu ? visit.service_menu.split(', ') : [])
      setSelectedStyleId(visit.style_category_id || null)
      setStaffName(visit.staff_name || '')
      if (visit.checkin_at) {
        const d = new Date(visit.checkin_at)
        setCheckinTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
      }
      if (visit.checkout_at) {
        const d = new Date(visit.checkout_at)
        setCheckoutTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
      }
      setPrice(visit.price ? String(visit.price) : '')
      setEditOpen(true)
    } catch {
      toast.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleCustomerSearch(value: string) {
    setCustomerQuery(value)
    if (value.length < 1) {
      setCustomerResults([])
      setShowCustomerDropdown(false)
      return
    }
    try {
      const data = await searchCustomers(value)
      setCustomerResults(data.map(c => ({ id: c.id, customer_code: c.customer_code, name: c.name })))
      setShowCustomerDropdown(true)
    } catch { /* silent */ }
  }

  function handleMenuToggle(menuName: string) {
    setSelectedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    )
  }

  async function handleSave() {
    if (!selectedCustomer || selectedMenus.length === 0 || !selectedStyleId) {
      toast.error('お客様、メニュー、スタイルを選択してください')
      return
    }
    setSubmitting(true)
    try {
      const today = visitDate
      const totalEstimated = selectedMenus.reduce((sum, name) => {
        const menu = serviceMenus.find(m => m.name === name)
        return sum + (menu?.estimated_minutes || 0)
      }, 0)

      const result = await updateVisitLog(visitId, {
        customer_id: selectedCustomer.id,
        service_menu: selectedMenus.join(', '),
        style_category_id: selectedStyleId,
        staff_name: staffName,
        checkin_at: checkinTime ? `${today}T${checkinTime}:00` : null,
        checkout_at: checkoutTime ? `${today}T${checkoutTime}:00` : null,
        price: price ? parseInt(price, 10) : null,
        expected_duration_minutes: totalEstimated || null,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('施術ログを更新しました')
        setEditOpen(false)
        router.refresh()
      }
    } catch {
      toast.error('更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setPasswordOpen(true)}
        title="編集"
        className="h-7 w-7 p-0"
        disabled={loading}
      >
        <Pencil className="h-3.5 w-3.5 text-blue-400 hover:text-blue-600" />
      </Button>

      <PasswordConfirmDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        title="施術ログを編集しますか？"
        description={`${visitDate}${customerName ? '（' + customerName + '）' : ''}の施術ログを編集します。`}
        onConfirm={handlePasswordConfirm}
        confirmLabel="編集する"
        variant="default"
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>施術ログ編集 - {visitDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* お客様 */}
            <div className="space-y-2">
              <Label className="font-semibold">お客様</Label>
              {selectedCustomer ? (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <span className="flex-1 font-medium text-sm">
                    {selectedCustomer.customer_code} {selectedCustomer.name}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>変更</Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="名前・IDで検索..."
                    value={customerQuery}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    onFocus={() => customerResults.length > 0 && setShowCustomerDropdown(true)}
                  />
                  {showCustomerDropdown && customerResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-40 overflow-auto">
                      {customerResults.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                          onClick={() => {
                            setSelectedCustomer(c)
                            setShowCustomerDropdown(false)
                            setCustomerQuery('')
                          }}
                        >
                          {c.customer_code} {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* メニュー */}
            <div className="space-y-2">
              <Label className="font-semibold">サービスメニュー</Label>
              <div className="grid grid-cols-2 gap-2">
                {serviceMenus.map(menu => {
                  const isSelected = selectedMenus.includes(menu.name)
                  return (
                    <Button
                      key={menu.id}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className={cn('h-10 text-sm relative', isSelected && 'ring-2 ring-offset-1')}
                      onClick={() => handleMenuToggle(menu.name)}
                    >
                      {isSelected && <Check className="h-3 w-3 mr-1" />}
                      {menu.name}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* スタイル */}
            <div className="space-y-2">
              <Label className="font-semibold">スタイル</Label>
              <div className="grid grid-cols-3 gap-2">
                {styles.map(style => (
                  <Button
                    key={style.id}
                    type="button"
                    variant={selectedStyleId === style.id ? 'default' : 'outline'}
                    size="sm"
                    className={cn('h-9 text-sm', selectedStyleId === style.id && 'ring-2 ring-offset-1')}
                    onClick={() => setSelectedStyleId(prev => prev === style.id ? null : style.id)}
                  >
                    {style.style_name}
                  </Button>
                ))}
              </div>
            </div>

            {/* 時刻 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">来店時刻</Label>
                <Input type="time" value={checkinTime} onChange={e => setCheckinTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">退店時刻</Label>
                <Input type="time" value={checkoutTime} onChange={e => setCheckoutTime(e.target.value)} />
              </div>
            </div>

            {/* 料金 */}
            <div className="space-y-1">
              <Label className="text-sm">施術料金</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* 担当 */}
            <div className="space-y-1">
              <Label className="text-sm">担当スタッフ</Label>
              <Input value={staffName} onChange={e => setStaffName(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>キャンセル</Button>
              <Button
                onClick={handleSave}
                disabled={submitting || !selectedCustomer || selectedMenus.length === 0 || !selectedStyleId}
                className="bg-gray-900 hover:bg-gray-800"
              >
                {submitting ? '保存中...' : '保存する'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
