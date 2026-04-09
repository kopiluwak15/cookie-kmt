'use client'

import { useState, useEffect } from 'react'
import {
  getChecklistItems,
  getStaffForAnnouncement,
  getChecklistAssignedStaffId,
  setChecklistAssignedStaffId,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  reorderChecklistItems,
} from '@/actions/labor-management'
import { PasswordConfirmDialog } from '@/components/features/password-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Loader2,
  Save,
  UserCheck,
} from 'lucide-react'

interface StaffMember {
  id: string
  name: string
  line_user_id: string | null
}

interface ChecklistItem {
  id: string
  label: string
  description: string | null
  sort_order: number
  is_active: boolean
}

export default function ChecklistManagementPage() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  // 担当スタッフ（全体で1人）
  const [assignedStaffId, setAssignedStaffId] = useState('')
  const [savedStaffId, setSavedStaffId] = useState('')
  const [savingStaff, setSavingStaff] = useState(false)

  // 新規追加
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [adding, setAdding] = useState(false)

  // 編集
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // 削除
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [itemsResult, staffResult, assignedResult] = await Promise.all([
        getChecklistItems(true),
        getStaffForAnnouncement(),
        getChecklistAssignedStaffId(),
      ])

      if (!itemsResult.error) {
        setItems(itemsResult.items || [])
      }
      if (!staffResult.error) {
        setStaffList(staffResult.staff || [])
      }
      if (!assignedResult.error) {
        setAssignedStaffId(assignedResult.staffId || '')
        setSavedStaffId(assignedResult.staffId || '')
      }
    } catch {
      toast.error('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getStaffName = (staffId: string) => {
    return staffList.find(s => s.id === staffId)?.name || ''
  }

  // === 担当スタッフ保存 ===
  const handleSaveStaff = async () => {
    if (!assignedStaffId) {
      toast.error('スタッフを選択してください')
      return
    }
    setSavingStaff(true)
    try {
      const result = await setChecklistAssignedStaffId(assignedStaffId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setSavedStaffId(assignedStaffId)
      toast.success(`担当者を${getStaffName(assignedStaffId)}に設定しました`)
    } finally {
      setSavingStaff(false)
    }
  }

  // === 新規追加 ===
  const handleAdd = async () => {
    if (!newLabel.trim()) {
      toast.error('項目名を入力してください')
      return
    }

    setAdding(true)
    try {
      const result = await createChecklistItem({
        label: newLabel.trim(),
        description: newDescription.trim(),
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('チェックリスト項目を追加しました')
      setNewLabel('')
      setNewDescription('')
      setShowAddForm(false)
      await loadData()
    } finally {
      setAdding(false)
    }
  }

  // === 編集 ===
  const startEdit = (item: ChecklistItem) => {
    setEditingId(item.id)
    setEditLabel(item.label)
    setEditDescription(item.description || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditLabel('')
    setEditDescription('')
  }

  const saveEdit = async () => {
    if (!editingId || !editLabel.trim()) return

    const result = await updateChecklistItem(editingId, {
      label: editLabel.trim(),
      description: editDescription.trim(),
    })

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('更新しました')
    cancelEdit()
    await loadData()
  }

  // === 削除 ===
  const handleDelete = async () => {
    if (!deleteTargetId) return

    const result = await deleteChecklistItem(deleteTargetId)
    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('チェックリスト項目を削除しました')
    setItems(items.filter(i => i.id !== deleteTargetId))
  }

  // === 並び替え ===
  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const newItems = [...items]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newItems.length) return

    ;[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]
    setItems(newItems)

    const result = await reorderChecklistItems(newItems.map(i => i.id))
    if (result.error) {
      toast.error(result.error)
      await loadData()
    }
  }

  const deleteTarget = items.find(i => i.id === deleteTargetId)
  const hasStaffChange = assignedStaffId !== savedStaffId

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ListChecks className="h-7 w-7" />
          <h2 className="text-2xl font-bold">退勤チェックリスト管理</h2>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ListChecks className="h-7 w-7" />
        <h2 className="text-2xl font-bold">退勤チェックリスト管理</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        毎日の退勤時に表示されるチェック項目です。担当スタッフを1人指定すると、そのスタッフの退勤時のみ全チェックリストが表示されます。
      </p>

      {/* 担当スタッフ選択（ページ上部） */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            担当スタッフ設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="スタッフを選択" />
              </SelectTrigger>
              <SelectContent>
                {staffList.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleSaveStaff}
              disabled={!hasStaffChange || savingStaff}
              size="sm"
            >
              {savingStaff ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              保存
            </Button>
          </div>
          {savedStaffId && (
            <p className="text-sm text-blue-700 mt-2">
              現在の担当: <span className="font-medium">{getStaffName(savedStaffId)}</span>
            </p>
          )}
          {!savedStaffId && (
            <p className="text-sm text-red-500 mt-2">
              ※ 担当スタッフが未設定です。退勤時にチェックリストは表示されません。
            </p>
          )}
        </CardContent>
      </Card>

      {/* チェックリスト一覧 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">チェックリスト項目</CardTitle>
          <span className="text-sm text-gray-500">{items.length}項目</span>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              チェックリスト項目がありません。追加してください。
            </p>
          ) : (
            items.map((item, index) => (
              <div key={item.id} className="rounded-lg border bg-white p-3">
                <div className="flex items-center gap-2">
                  {/* 並び替え */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {editingId === item.id ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="項目名"
                        className="h-8"
                      />
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="説明（任意）"
                        className="h-8"
                      />
                      <div className="flex gap-2">
                        <Button onClick={saveEdit} size="sm" className="h-7 text-xs">
                          <Check className="h-3 w-3 mr-1" /> 保存
                        </Button>
                        <Button onClick={cancelEdit} variant="outline" size="sm" className="h-7 text-xs">
                          <X className="h-3 w-3 mr-1" /> キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-400">{index + 1}.</span>
                          <h4 className="font-medium">{item.label}</h4>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-500 ml-6">{item.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(item.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 新規追加フォーム */}
      {showAddForm ? (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">新しい項目を追加</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>項目名</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="例: エアコン消灯"
              />
            </div>
            <div className="space-y-2">
              <Label>説明（任意）</Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="例: 店内のエアコンと照明をすべてオフにする"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                追加
              </Button>
              <Button
                onClick={() => {
                  setShowAddForm(false)
                  setNewLabel('')
                  setNewDescription('')
                }}
                variant="outline"
              >
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowAddForm(true)} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          チェックリスト項目を追加
        </Button>
      )}

      {/* 削除確認ダイアログ */}
      <PasswordConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}
        title="チェックリスト項目を削除"
        description={`「${deleteTarget?.label || ''}」を削除します。`}
        onConfirm={handleDelete}
        confirmLabel="削除する"
        variant="destructive"
      />
    </div>
  )
}
