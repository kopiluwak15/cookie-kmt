'use client'

import { useEffect, useMemo, useState } from 'react'
import { getServiceMenus, updateServiceMenu, createServiceMenu } from '@/actions/service-menus'
import { verifyPassword } from '@/actions/verify-password'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Save, ChevronDown, ChevronRight } from 'lucide-react'

const CATEGORY_ORDER = [
  'カット',
  '部分カット',
  'カラー',
  'パーマ',
  'ストレート・縮毛矯正',
  'トリートメント',
  'ヘッドスパ',
  'オプション',
  'コスメパーマ',
  'セット・メイク',
  '店販（シャンプー）',
  '店販（トリートメント）',
  '店販（スタイリング）',
]
import type { ServiceMenuItem } from '@/types'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

function getDemoMenus(): ServiceMenuItem[] {
  return [
    { id: 'demo-m1', name: '縮毛矯正', category: 'ストレート・縮毛矯正', estimated_minutes: 180, default_price: 8000, display_order: 1, is_active: true, is_concept: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'demo-m2', name: 'モイスチャートリートメント', category: 'トリートメント', estimated_minutes: 30, default_price: 8000, display_order: 2, is_active: true, is_concept: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'demo-m3', name: 'カット(一般)', category: 'カット', estimated_minutes: 30, default_price: 4500, display_order: 3, is_active: true, is_concept: false, created_at: '2024-01-01T00:00:00Z' },
    { id: 'demo-m4', name: 'ジュエルカラー', category: 'カラー', estimated_minutes: 60, default_price: 5500, display_order: 4, is_active: true, is_concept: false, created_at: '2024-01-01T00:00:00Z' },
    { id: 'demo-m5', name: '極上30分ヘッドスパ', category: 'ヘッドスパ', estimated_minutes: 30, default_price: 3000, display_order: 5, is_active: true, is_concept: false, created_at: '2024-01-01T00:00:00Z' },
  ]
}

export default function MenusPage() {
  const [menus, setMenus] = useState<ServiceMenuItem[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<ServiceMenuItem>>>({})
  const [dialogOpen, setDialogOpen] = useState(false)

  // コンセプト変更パスワードダイアログ
  const [conceptPwOpen, setConceptPwOpen] = useState(false)
  const [conceptPwInput, setConceptPwInput] = useState('')
  const [conceptPwError, setConceptPwError] = useState<string | null>(null)
  const [conceptVerifying, setConceptVerifying] = useState(false)
  const [pendingConceptChange, setPendingConceptChange] = useState<{
    id: string
    next: boolean
  } | null>(null)

  // 開いているカテゴリ
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())

  // カテゴリ別グループ化
  const categorized = useMemo(() => {
    const map = new Map<string, ServiceMenuItem[]>()
    for (const m of menus) {
      const cat = m.category || '未分類'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(m)
    }
    const ordered: { category: string; items: ServiceMenuItem[] }[] = []
    for (const c of CATEGORY_ORDER) {
      if (map.has(c)) ordered.push({ category: c, items: map.get(c)! })
    }
    for (const [c, items] of map.entries()) {
      if (!CATEGORY_ORDER.includes(c)) ordered.push({ category: c, items })
    }
    return ordered
  }, [menus])

  function toggleCategory(cat: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  useEffect(() => {
    loadMenus()
  }, [])

  async function loadMenus() {
    if (!isSupabaseConfigured) {
      setMenus(getDemoMenus())
      return
    }
    const data = await getServiceMenus()
    setMenus(data)
  }

  function handleEdit(id: string, field: string, value: string | number | boolean | null) {
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
      await updateServiceMenu(id, updates)
      toast.success('保存しました')
      setEditing((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      loadMenus()
    } catch {
      toast.error('保存に失敗しました')
    }
  }

  // コンセプトトグルがクリックされたら、まずパスワードダイアログを開く
  function requestConceptToggle(id: string, next: boolean) {
    setPendingConceptChange({ id, next })
    setConceptPwInput('')
    setConceptPwError(null)
    setConceptPwOpen(true)
  }

  // パスワード検証 → OK ならその場で is_concept を保存（編集バッファを経由しない）
  async function handleConfirmConceptChange() {
    if (!pendingConceptChange) return
    setConceptVerifying(true)
    setConceptPwError(null)
    try {
      if (isSupabaseConfigured) {
        const result = await verifyPassword(conceptPwInput)
        if (!result.valid) {
          setConceptPwError(result.error || 'パスワードが正しくありません')
          return
        }
        await updateServiceMenu(pendingConceptChange.id, {
          is_concept: pendingConceptChange.next,
        })
        await loadMenus()
      } else {
        // デモモード: ローカルだけ反映
        setMenus((prev) =>
          prev.map((m) =>
            m.id === pendingConceptChange.id
              ? { ...m, is_concept: pendingConceptChange.next }
              : m
          )
        )
      }
      toast.success(
        pendingConceptChange.next
          ? '★ コンセプトメニューに設定しました'
          : '通常メニューに変更しました'
      )
      setConceptPwOpen(false)
      setPendingConceptChange(null)
      setConceptPwInput('')
    } catch (e) {
      setConceptPwError(e instanceof Error ? e.message : '更新に失敗しました')
    } finally {
      setConceptVerifying(false)
    }
  }

  async function handleCreate(formData: FormData) {
    if (!isSupabaseConfigured) {
      toast.success('デモモード: 追加しました（実際には保存されません）')
      setDialogOpen(false)
      return
    }

    try {
      await createServiceMenu(formData)
      toast.success('追加しました')
      setDialogOpen(false)
      loadMenus()
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
        <h2 className="text-2xl font-bold">メニュー設定</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新規追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>メニュー追加</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>カテゴリ</Label>
                <Input name="category" placeholder="例: カット / カラー" list="category-list" />
                <datalist id="category-list">
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>メニュー名</Label>
                <Input name="name" required placeholder="例: ヘッドスパ" />
              </div>
              <div className="space-y-2">
                <Label>推定施術時間（分）</Label>
                <Input name="estimated_minutes" type="number" defaultValue={60} required />
              </div>
              <div className="space-y-2">
                <Label>デフォルト価格（円）</Label>
                <Input name="default_price" type="number" placeholder="未設定可" />
              </div>
              <Button type="submit" className="w-full">追加する</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">サービスメニュー一覧</CardTitle>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setOpenCategories(new Set(categorized.map((c) => c.category)))
              }
              className="text-xs text-blue-600 hover:underline"
            >
              すべて開く
            </button>
            <button
              type="button"
              onClick={() => setOpenCategories(new Set())}
              className="text-xs text-blue-600 hover:underline"
            >
              すべて閉じる
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {categorized.map(({ category, items }) => {
            const isOpen = openCategories.has(category)
            const conceptCount = items.filter((i) => i.is_concept).length
            return (
              <div key={category} className="border rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-semibold">{category}</span>
                    <span className="text-xs text-muted-foreground">
                      {items.length} 件
                    </span>
                    {conceptCount > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        ★ {conceptCount}
                      </span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>カテゴリ</TableHead>
                          <TableHead>メニュー名</TableHead>
                          <TableHead className="text-center">推定時間（分）</TableHead>
                          <TableHead className="text-center">デフォルト価格</TableHead>
                          <TableHead className="text-center">コンセプト</TableHead>
                          <TableHead className="text-center">状態</TableHead>
                          <TableHead className="text-center">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                {items.map((menu) => {
                  const edits = editing[menu.id] || {}
                  const hasChanges = Object.keys(edits).length > 0

                  return (
                    <TableRow key={menu.id}>
                      <TableCell>
                        <Input
                          defaultValue={menu.category ?? ''}
                          onChange={(e) =>
                            handleEdit(menu.id, 'category', e.target.value || null)
                          }
                          placeholder="未分類"
                          className="w-32 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          defaultValue={menu.name}
                          onChange={(e) =>
                            handleEdit(menu.id, 'name', e.target.value)
                          }
                          className="w-44"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          defaultValue={menu.estimated_minutes}
                          onChange={(e) =>
                            handleEdit(menu.id, 'estimated_minutes', Number(e.target.value))
                          }
                          className="w-20 mx-auto text-center"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          defaultValue={menu.default_price ?? ''}
                          onChange={(e) =>
                            handleEdit(menu.id, 'default_price', e.target.value ? Number(e.target.value) : null)
                          }
                          placeholder="-"
                          className="w-24 mx-auto text-center"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant={menu.is_concept ? 'default' : 'outline'}
                          className={
                            menu.is_concept
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : ''
                          }
                          onClick={() => requestConceptToggle(menu.id, !menu.is_concept)}
                          title="変更にはオーナーパスワードが必要です"
                        >
                          {menu.is_concept ? '★ コンセプト' : '通常'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant={
                            (edits.is_active !== undefined ? edits.is_active : menu.is_active)
                              ? 'default'
                              : 'secondary'
                          }
                          onClick={() =>
                            handleEdit(
                              menu.id,
                              'is_active',
                              !(edits.is_active !== undefined ? edits.is_active : menu.is_active)
                            )
                          }
                        >
                          {(edits.is_active !== undefined ? edits.is_active : menu.is_active) ? '有効' : '無効'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          disabled={!hasChanges}
                          onClick={() => handleSave(menu.id)}
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
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-sm text-muted-foreground">
            60分基準時間について
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            各メニューの推定時間を元に、施術効率を「60分あたり」で比較できます。
            COOKIE 熊本ではカット・カラー・パーマがそれぞれ60分基準です。
          </p>
          <p>
            例: カット(60分) + カラー(60分) = 推定120分
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>120分で完了 → 60分基準: 60.0分</li>
            <li>108分で完了 → 60分基準: 54.0分（効率良い）</li>
            <li>132分で完了 → 60分基準: 66.0分（時間超過）</li>
          </ul>
        </CardContent>
      </Card>

      {/* コンセプト変更パスワードダイアログ */}
      <Dialog
        open={conceptPwOpen}
        onOpenChange={(open) => {
          setConceptPwOpen(open)
          if (!open) {
            setPendingConceptChange(null)
            setConceptPwInput('')
            setConceptPwError(null)
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pendingConceptChange?.next ? '★ コンセプトに設定' : '通常メニューに変更'}
            </DialogTitle>
            <DialogDescription>
              コンセプトメニューの設定はリピート分析の重要な指標です。
              変更にはオーナーのログインパスワードが必要です。
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!conceptVerifying) handleConfirmConceptChange()
            }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="concept-pw">パスワード</Label>
              <Input
                id="concept-pw"
                type="password"
                value={conceptPwInput}
                onChange={(e) => setConceptPwInput(e.target.value)}
                autoFocus
                disabled={conceptVerifying}
                placeholder="ログインパスワード"
              />
              {conceptPwError && (
                <p className="text-xs text-red-600">{conceptPwError}</p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConceptPwOpen(false)}
                disabled={conceptVerifying}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={conceptVerifying || !conceptPwInput}>
                {conceptVerifying ? '確認中...' : '変更する'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
