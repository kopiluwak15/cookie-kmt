'use client'

import { useEffect, useState } from 'react'
import { getStyleSettings, updateStyleSetting, createStyleSetting } from '@/actions/styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Save } from 'lucide-react'
import type { StyleSetting } from '@/types'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

function getDemoStyles(): StyleSetting[] {
  return [
    { id: 'demo-s1', style_name: 'ツーブロック', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 1, is_active: true, gender: 'male', created_at: '2024-01-01T00:00:00Z' },
    { id: 'demo-s2', style_name: '震災刈り', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 2, is_active: true, gender: 'male', created_at: '2024-01-01T00:00:00Z' },
    { id: 'demo-s3', style_name: 'マッシュ', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 3, is_active: true, gender: 'male', created_at: '2024-01-01T00:00:00Z' },
    { id: 'demo-s4', style_name: 'ウルフ', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 4, is_active: true, gender: 'male', created_at: '2024-01-01T00:00:00Z' },
    { id: 'demo-s5', style_name: 'ショート', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 5, is_active: true, gender: 'male', created_at: '2024-01-01T00:00:00Z' },
    { id: 'demo-s6', style_name: 'ミディアム', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 6, is_active: true, gender: 'male', created_at: '2024-01-01T00:00:00Z' },
    { id: 'demo-s7', style_name: 'フェード', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 7, is_active: true, gender: 'male', created_at: '2024-01-01T00:00:00Z' },
  ]
}

export default function StylesPage() {
  const [styles, setStyles] = useState<StyleSetting[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<StyleSetting>>>({})
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadStyles()
  }, [])

  async function loadStyles() {
    if (!isSupabaseConfigured) {
      setStyles(getDemoStyles())
      return
    }
    const data = await getStyleSettings()
    setStyles(data)
  }

  function handleEdit(id: string, field: string, value: string | number | boolean) {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  async function handleSave(id: string) {
    const updates = editing[id]
    if (!updates) return

    if (!isSupabaseConfigured) {
      toast.success('デモモード: 保存しました（実際には保存されません）')
      setEditing((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      return
    }

    try {
      await updateStyleSetting(id, updates)
      toast.success('保存しました')
      setEditing((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      loadStyles()
    } catch {
      toast.error('保存に失敗しました')
    }
  }

  async function handleCreate(formData: FormData) {
    if (!isSupabaseConfigured) {
      toast.success('デモモード: 追加しました（実際には保存されません）')
      setDialogOpen(false)
      return
    }

    try {
      await createStyleSetting(formData)
      toast.success('追加しました')
      setDialogOpen(false)
      loadStyles()
    } catch {
      toast.error('追加に失敗しました')
    }
  }

  return (
    <div className="space-y-6">
      {!isSupabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          デモモードで表示中です。Supabaseの認証情報を .env.local に設定すると実データが表示されます。
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">スタイル設定</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新規追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>スタイル追加</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>スタイル名</Label>
                <Input name="style_name" required />
              </div>
              <div className="space-y-2">
                <Label>基本来店周期（日）</Label>
                <Input name="base_cycle_days" type="number" defaultValue={28} required />
              </div>
              <div className="space-y-2">
                <Label>リマインド①（日後）</Label>
                <Input name="reminder1_days" type="number" defaultValue={21} required />
              </div>
              <div className="space-y-2">
                <Label>リマインド②（日後）</Label>
                <Input name="reminder2_days" type="number" defaultValue={35} required />
              </div>
              <div className="space-y-2">
                <Label>性別</Label>
                <select
                  name="gender"
                  defaultValue="male"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="unisex">男女兼用</option>
                </select>
              </div>
              <Button type="submit" className="w-full">追加する</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">スタイル別周期設定</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>スタイル名</TableHead>
                <TableHead className="text-center">性別</TableHead>
                <TableHead className="text-center">基本周期（日）</TableHead>
                <TableHead className="text-center">リマインド①（日後）</TableHead>
                <TableHead className="text-center">リマインド②（日後）</TableHead>
                <TableHead className="text-center">状態</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {styles.map((style) => {
                const edits = editing[style.id] || {}
                const hasChanges = Object.keys(edits).length > 0

                return (
                  <TableRow key={style.id}>
                    <TableCell>
                      <Input
                        defaultValue={style.style_name}
                        onChange={(e) =>
                          handleEdit(style.id, 'style_name', e.target.value)
                        }
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <select
                        defaultValue={style.gender || 'male'}
                        onChange={(e) =>
                          handleEdit(style.id, 'gender', e.target.value)
                        }
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="male">男性</option>
                        <option value="female">女性</option>
                        <option value="unisex">兼用</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        defaultValue={style.base_cycle_days}
                        onChange={(e) =>
                          handleEdit(style.id, 'base_cycle_days', Number(e.target.value))
                        }
                        className="w-20 mx-auto text-center"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        defaultValue={style.reminder1_days}
                        onChange={(e) =>
                          handleEdit(style.id, 'reminder1_days', Number(e.target.value))
                        }
                        className="w-20 mx-auto text-center"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        defaultValue={style.reminder2_days}
                        onChange={(e) =>
                          handleEdit(style.id, 'reminder2_days', Number(e.target.value))
                        }
                        className="w-20 mx-auto text-center"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant={style.is_active ? 'default' : 'secondary'}
                        onClick={() => handleEdit(style.id, 'is_active', !style.is_active)}
                      >
                        {(edits.is_active !== undefined ? edits.is_active : style.is_active) ? '有効' : '無効'}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        disabled={!hasChanges}
                        onClick={() => handleSave(style.id)}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        保存
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
