'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { Loader2, RefreshCw, AlertTriangle, FilePenLine } from 'lucide-react'
import {
  getPendingVisitLogCustomers,
  type PendingVisitLogCustomer,
} from '@/actions/admin-pending-visitlog'

export default function PendingVisitLogPage() {
  const [customers, setCustomers] = useState<PendingVisitLogCustomer[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPendingVisitLogCustomers()
      setCustomers(data)
    } catch {
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 日付でグルーピング
  const grouped = customers.reduce<Record<string, PendingVisitLogCustomer[]>>(
    (acc, c) => {
      if (!acc[c.checkin_date]) acc[c.checkin_date] = []
      acc[c.checkin_date].push(c)
      return acc
    },
    {}
  )
  // 日付降順（新しい日から表示）
  const sortedDates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">ログ未入力</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">前日までにチェックインがあったが、施術ログが入力されていないお客様です。</p>
          <p className="text-xs mt-1">
            チェックイン時間順（早い順）に並んでいます。担当スタッフは速やかに施術ログを入力してください。
          </p>
        </div>
      </div>

      {/* KPIサマリー */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">未入力の合計</p>
                <p className="text-2xl font-bold text-red-700">{customers.length}人</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">対象日数</p>
              <p className="text-2xl font-bold">{sortedDates.length}日分</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            ログ未入力のお客様はいません 🎉
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <PendingDateTable
              key={date}
              date={date}
              customers={grouped[date]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// ヘルパー
// ============================================

function formatCheckinDate(dateStr: string): string {
  // YYYY-MM-DD → M月D日（曜日）
  const d = new Date(dateStr)
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  const wd = weekdays[d.getUTCDay()]
  return `${m}月${day}日（${wd}）`
}

function formatCheckinTime(isoStr: string): string {
  // JST 時刻
  const d = new Date(isoStr)
  const jstMs = d.getTime() + 9 * 60 * 60 * 1000
  const jst = new Date(jstMs)
  return `${jst.getUTCHours()}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

function PendingDateTable({
  date,
  customers,
}: {
  date: string
  customers: PendingVisitLogCustomer[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {formatCheckinDate(date)}
          <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">
            {customers.length}人
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">チェックイン時刻</TableHead>
                <TableHead>顧客</TableHead>
                <TableHead className="text-center w-[160px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.customer_id}>
                  <TableCell className="font-mono text-sm">
                    {formatCheckinTime(c.checkin_at)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/customers/${c.customer_id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {c.customer_code || '---'} {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button asChild size="sm" variant="default">
                      <Link href="/staff/visit-log">
                        <FilePenLine className="h-4 w-4 mr-1" />
                        施術ログ入力
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
