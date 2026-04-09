'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCustomer } from '@/actions/customers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PasswordConfirmDialog } from '@/components/features/password-confirm-dialog'
import { Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { VISIT_MOTIVATIONS } from '@/types'

const BIRTH_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

interface CustomerData {
  id: string
  name: string
  name_kana: string | null
  phone: string | null
  birth_month: number | null
  visit_motivation: string | null
  individual_cycle_days: number | null
  notes: string | null
  first_visit_date: string | null
  last_visit_date: string | null
}

interface EditCustomerButtonProps {
  customer: CustomerData
}

export function EditCustomerButton({ customer }: EditCustomerButtonProps) {
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // フォーム状態
  const [form, setForm] = useState({
    name: customer.name || '',
    name_kana: customer.name_kana || '',
    phone: customer.phone || '',
    birth_month: customer.birth_month,
    visit_motivation: customer.visit_motivation || '',
    individual_cycle_days: customer.individual_cycle_days,
    notes: customer.notes || '',
    first_visit_date: customer.first_visit_date || '',
    last_visit_date: customer.last_visit_date || '',
  })

  async function handlePasswordConfirm() {
    // パスワード確認後、編集ダイアログを開く
    setPasswordOpen(false)
    setEditOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('名前は必須です')
      return
    }

    setSaving(true)
    try {
      const result = await updateCustomer(customer.id, {
        name: form.name.trim(),
        name_kana: form.name_kana.trim() || null,
        phone: form.phone.trim() || null,
        birth_month: form.birth_month,
        visit_motivation: form.visit_motivation || null,
        individual_cycle_days: form.individual_cycle_days,
        notes: form.notes.trim() || null,
        first_visit_date: form.first_visit_date || null,
        last_visit_date: form.last_visit_date || null,
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success('顧客情報を更新しました')
      setEditOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPasswordOpen(true)}
      >
        <Pencil className="h-4 w-4 mr-1" />
        編集
      </Button>

      <PasswordConfirmDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        title="顧客情報を編集"
        description="顧客情報を編集するにはパスワードを入力してください。"
        onConfirm={handlePasswordConfirm}
        confirmLabel="編集する"
        variant="default"
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>顧客情報の編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* 名前 */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">名前 <span className="text-red-500">*</span></Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* フリガナ */}
            <div className="space-y-2">
              <Label htmlFor="edit-kana">フリガナ</Label>
              <Input
                id="edit-kana"
                value={form.name_kana}
                onChange={(e) => setForm({ ...form, name_kana: e.target.value })}
              />
            </div>

            {/* 電話番号 */}
            <div className="space-y-2">
              <Label htmlFor="edit-phone">電話番号</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            {/* 初回来店日・最終来店日 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-first-visit">初回来店日</Label>
                <Input
                  id="edit-first-visit"
                  type="date"
                  value={form.first_visit_date}
                  onChange={(e) => setForm({ ...form, first_visit_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-visit">最終来店日</Label>
                <Input
                  id="edit-last-visit"
                  type="date"
                  value={form.last_visit_date}
                  onChange={(e) => setForm({ ...form, last_visit_date: e.target.value })}
                />
              </div>
            </div>

            {/* 誕生月 */}
            <div className="space-y-2">
              <Label>誕生月</Label>
              <Select
                value={form.birth_month ? String(form.birth_month) : 'none'}
                onValueChange={(v) => setForm({ ...form, birth_month: v === 'none' ? null : Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未設定</SelectItem>
                  {BIRTH_MONTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>{m}月</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 来店経路 */}
            <div className="space-y-2">
              <Label>来店経路</Label>
              <Select
                value={form.visit_motivation || 'none'}
                onValueChange={(v) => setForm({ ...form, visit_motivation: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未設定</SelectItem>
                  {VISIT_MOTIVATIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 個別来店周期 */}
            <div className="space-y-2">
              <Label htmlFor="edit-cycle">個別来店周期（日）</Label>
              <Input
                id="edit-cycle"
                type="number"
                min={1}
                max={365}
                value={form.individual_cycle_days ?? ''}
                onChange={(e) => setForm({
                  ...form,
                  individual_cycle_days: e.target.value ? Number(e.target.value) : null,
                })}
                placeholder="未設定（スタイル設定に従う）"
              />
            </div>

            {/* メモ */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">メモ</Label>
              <Textarea
                id="edit-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="施術時の注意点など"
              />
            </div>

            {/* ボタン */}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存する'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
