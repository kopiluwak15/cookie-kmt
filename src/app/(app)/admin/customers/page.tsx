'use client'

import { useEffect, useState, useCallback } from 'react'
import { searchCustomers, createManualCustomer } from '@/actions/customers'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const VISIT_MOTIVATIONS = [
  'Instagram',
  'Google検索・マップ',
  'ホットペッパー',
  '友人・知人の紹介',
  '看板・通りがかり',
  'その他',
]

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

interface CustomerRow {
  id: string
  customer_code: string
  name: string
  name_kana: string | null
  phone: string | null
  last_visit_date: string | null
  total_visits: number
  line_user_id: string | null
  line_blocked: boolean
}

function getDemoCustomers(): CustomerRow[] {
  return [
    { id: 'demo-1', customer_code: 'C-0001', name: '田中 太郎', name_kana: 'タナカ タロウ', phone: '090-1234-5678', last_visit_date: '2025-12-20', total_visits: 12, line_user_id: 'U001', line_blocked: false },
    { id: 'demo-2', customer_code: 'C-0002', name: '佐藤 健一', name_kana: 'サトウ ケンイチ', phone: '090-2345-6789', last_visit_date: '2025-12-18', total_visits: 8, line_user_id: 'U002', line_blocked: false },
    { id: 'demo-3', customer_code: 'C-0003', name: '鈴木 大輔', name_kana: 'スズキ ダイスケ', phone: '080-3456-7890', last_visit_date: '2025-12-15', total_visits: 5, line_user_id: null, line_blocked: false },
    { id: 'demo-4', customer_code: 'C-0004', name: '高橋 翔太', name_kana: 'タカハシ ショウタ', phone: '070-4567-8901', last_visit_date: '2025-11-28', total_visits: 3, line_user_id: 'U004', line_blocked: true },
    { id: 'demo-5', customer_code: 'C-0005', name: '伊藤 拓海', name_kana: 'イトウ タクミ', phone: '090-5678-9012', last_visit_date: '2025-11-10', total_visits: 15, line_user_id: 'U005', line_blocked: false },
    { id: 'demo-6', customer_code: 'C-0006', name: '渡辺 蓮', name_kana: 'ワタナベ レン', phone: '080-6789-0123', last_visit_date: '2025-10-22', total_visits: 2, line_user_id: null, line_blocked: false },
    { id: 'demo-7', customer_code: 'C-0007', name: '山本 悠真', name_kana: 'ヤマモト ユウマ', phone: '090-7890-1234', last_visit_date: '2025-12-22', total_visits: 20, line_user_id: 'U007', line_blocked: false },
    { id: 'demo-8', customer_code: 'C-0008', name: '中村 陸', name_kana: 'ナカムラ リク', phone: null, last_visit_date: '2025-09-05', total_visits: 1, line_user_id: null, line_blocked: false },
  ]
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newMotivation, setNewMotivation] = useState('')
  const [adding, setAdding] = useState(false)

  const loadCustomers = useCallback(async (search?: string) => {
    if (!isSupabaseConfigured) {
      const demo = getDemoCustomers()
      if (search && search.length > 0) {
        const q = search.toLowerCase()
        setCustomers(demo.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.customer_code.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q))
        ))
      } else {
        setCustomers(demo)
      }
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      if (search && search.length > 0) {
        const data = await searchCustomers(search)
        setCustomers(data as unknown as CustomerRow[])
      } else {
        const supabase = createClient()
        const { data } = await supabase
          .from('customer')
          .select('id, customer_code, name, name_kana, phone, last_visit_date, total_visits, line_user_id, line_blocked')
          .order('created_at', { ascending: false })
          .limit(50)
        setCustomers((data || []) as CustomerRow[])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, loadCustomers])

  const handleAddCustomer = async () => {
    if (!newName.trim()) {
      toast.error('名前を入力してください')
      return
    }
    setAdding(true)
    try {
      const result = await createManualCustomer({
        name: newName.trim(),
        phone: newPhone.trim() || null,
        visit_motivation: newMotivation || null,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${result.customer?.name}（${result.customer?.customer_code}）を登録しました`)
      setAddOpen(false)
      setNewName('')
      setNewPhone('')
      setNewMotivation('')
      loadCustomers()
    } catch {
      toast.error('登録に失敗しました')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">顧客管理</h2>
        {isSupabaseConfigured && (
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            手動追加
          </Button>
        )}
      </div>

      {/* 手動追加ダイアログ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>顧客を手動追加</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            LINE未登録のお客様を手動で登録します。本日のチェックイン済みとして施術ログに表示されます。
          </p>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">名前 <span className="text-red-500">*</span></Label>
              <Input
                id="add-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例：山田 太郎"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">電話番号</Label>
              <Input
                id="add-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="例：09012345678"
              />
            </div>
            <div className="space-y-2">
              <Label>来店経路</Label>
              <Select value={newMotivation} onValueChange={setNewMotivation}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_MOTIVATIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
                キャンセル
              </Button>
              <Button onClick={handleAddCustomer} disabled={adding || !newName.trim()}>
                {adding ? '登録中...' : '登録する'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {!isSupabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          デモモードで表示中です。Supabaseの認証情報を .env.local に設定すると実データが表示されます。
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="名前・ID・電話番号で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            顧客一覧 {!loading && `(${customers.length}件)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>顧客ID</TableHead>
                <TableHead>名前</TableHead>
                <TableHead>電話番号</TableHead>
                <TableHead className="text-center">来店回数</TableHead>
                <TableHead>最終来店日</TableHead>
                <TableHead className="text-center">LINE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    顧客が見つかりません
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {customer.customer_code}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell className="text-center">{customer.total_visits}</TableCell>
                    <TableCell>{customer.last_visit_date || '-'}</TableCell>
                    <TableCell className="text-center">
                      {customer.line_user_id ? (
                        customer.line_blocked ? (
                          <Badge variant="destructive">ブロック</Badge>
                        ) : (
                          <Badge variant="default">連携済</Badge>
                        )
                      ) : (
                        <Badge variant="secondary">未連携</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
