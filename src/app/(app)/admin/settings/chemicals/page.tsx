'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, RotateCcw, Loader2 } from 'lucide-react'
import {
  getAllChemicalPresets,
  addChemicalPreset,
  deleteChemicalPreset,
  restoreChemicalPreset,
  type ChemicalPreset,
} from '@/actions/chemical-presets'
import { toast } from 'sonner'

const CATEGORIES = ['ストレート', 'カラー', 'パーマ', 'トリートメント']

export default function ChemicalsSettingsPage() {
  const [presets, setPresets] = useState<ChemicalPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState<Record<string, string>>({})
  const [adding, startAdd] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)

  const load = async () => {
    const data = await getAllChemicalPresets()
    setPresets(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    items: presets.filter((p) => p.category === cat),
  }))

  const handleAdd = (category: string) => {
    const name = (newName[category] || '').trim()
    if (!name) return
    startAdd(async () => {
      const res = await addChemicalPreset(category, name)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`「${name}」を追加しました`)
        setNewName((prev) => ({ ...prev, [category]: '' }))
        await load()
      }
    })
  }

  const handleDelete = async (id: string, name: string) => {
    setActionId(id)
    const res = await deleteChemicalPreset(id)
    if (res.error) toast.error(res.error)
    else {
      toast.success(`「${name}」を無効化しました`)
      await load()
    }
    setActionId(null)
  }

  const handleRestore = async (id: string, name: string) => {
    setActionId(id)
    const res = await restoreChemicalPreset(id)
    if (res.error) toast.error(res.error)
    else {
      toast.success(`「${name}」を復元しました`)
      await load()
    }
    setActionId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">薬剤プリセット管理</h2>
        <p className="text-sm text-muted-foreground">
          施術ログの薬剤チップ選択肢を管理します。無効化した薬剤は選択肢に表示されなくなります。
        </p>
      </div>

      {grouped.map(({ category, items }) => {
        const active = items.filter((i) => i.is_active)
        const inactive = items.filter((i) => !i.is_active)

        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {category}
                <Badge variant="secondary" className="text-xs font-normal">
                  {active.length}件
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 有効な薬剤 */}
              <div className="flex flex-wrap gap-2">
                {active.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm bg-background"
                  >
                    <span>{item.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      disabled={actionId === item.id}
                      className="ml-1 text-muted-foreground hover:text-red-500 transition-colors"
                      title="無効化"
                    >
                      {actionId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* 無効化済み */}
              {inactive.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">無効化済み:</p>
                  <div className="flex flex-wrap gap-2">
                    {inactive.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground bg-muted/30"
                      >
                        <span className="line-through">{item.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRestore(item.id, item.name)}
                          disabled={actionId === item.id}
                          className="ml-1 hover:text-emerald-600 transition-colors"
                          title="復元"
                        >
                          {actionId === item.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 追加フォーム */}
              <div className="flex items-center gap-2 pt-1">
                <Input
                  value={newName[category] || ''}
                  onChange={(e) =>
                    setNewName((prev) => ({ ...prev, [category]: e.target.value }))
                  }
                  placeholder="新しい薬剤名を入力"
                  className="h-8 text-sm max-w-[240px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAdd(category)
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdd(category)}
                  disabled={adding || !(newName[category] || '').trim()}
                  className="h-8"
                >
                  {adding ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  <span className="ml-1">追加</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
