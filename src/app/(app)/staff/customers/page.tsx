'use client'

import { useEffect, useState, useCallback } from 'react'
import { searchCustomers } from '@/actions/customers'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
  ]
}

export default function StaffCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">顧客一覧</h2>

      {!isSupabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          デモモードで表示中です。
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
          <div className="overflow-x-auto">
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
                          href={`/staff/customers/${customer.id}`}
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
