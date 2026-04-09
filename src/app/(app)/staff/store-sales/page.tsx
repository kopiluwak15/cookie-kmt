import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TrendingUp } from 'lucide-react'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

interface VisitRecord {
  visit_date: string
  staff_name: string
  price: number | null
  checkin_at: string | null
  checkout_at: string | null
}

interface StaffSummary {
  staffName: string
  revenue: number
  count: number
  avgPrice: number
}

interface MonthlySummary {
  month: string
  label: string
  revenue: number
  count: number
  avgPrice: number
}

function calcDurationMin(checkin: string | null, checkout: string | null): number | null {
  if (!checkin || !checkout) return null
  const diff = (new Date(checkout).getTime() - new Date(checkin).getTime()) / 60000
  return diff > 0 ? diff : null
}

function aggregateByStaff(visits: VisitRecord[]): StaffSummary[] {
  const map = new Map<string, { revenue: number; count: number }>()
  visits.forEach((v) => {
    const entry = map.get(v.staff_name) || { revenue: 0, count: 0 }
    entry.revenue += v.price || 0
    entry.count += 1
    map.set(v.staff_name, entry)
  })
  return Array.from(map.entries())
    .map(([staffName, data]) => ({
      staffName,
      revenue: data.revenue,
      count: data.count,
      avgPrice: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

function aggregateByMonth(visits: VisitRecord[]): MonthlySummary[] {
  const map = new Map<string, { revenue: number; count: number }>()
  visits.forEach((v) => {
    const month = v.visit_date.substring(0, 7)
    const entry = map.get(month) || { revenue: 0, count: 0 }
    entry.revenue += v.price || 0
    entry.count += 1
    map.set(month, entry)
  })
  return Array.from(map.entries())
    .map(([month, data]) => {
      const [y, m] = month.split('-')
      return {
        month,
        label: `${y}年${parseInt(m)}月`,
        revenue: data.revenue,
        count: data.count,
        avgPrice: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
      }
    })
    .sort((a, b) => b.month.localeCompare(a.month))
}

function getDemoVisits(): VisitRecord[] {
  const raw: [string, number, number][] = [
    ['2026-03-06', 0, 4500], ['2026-03-06', 1, 5000],
    ['2026-03-05', 1, 5000], ['2026-03-05', 0, 4500], ['2026-03-05', 0, 4000],
    ['2026-03-04', 0, 4000], ['2026-03-04', 1, 5500],
    ['2026-03-03', 1, 5000], ['2026-03-03', 0, 4500],
    ['2026-03-02', 0, 4500], ['2026-03-02', 1, 5000],
    ['2026-03-01', 1, 5000], ['2026-03-01', 0, 4000], ['2026-03-01', 0, 4500],
    ['2026-02-28', 0, 4500], ['2026-02-28', 1, 5000],
    ['2026-02-25', 0, 4500], ['2026-02-25', 1, 5000],
    ['2026-02-20', 0, 4000], ['2026-02-15', 1, 5500],
    ['2026-02-10', 0, 4500], ['2026-02-05', 1, 5000],
    ['2026-01-30', 0, 4500], ['2026-01-25', 1, 5000],
    ['2026-01-20', 0, 4000], ['2026-01-15', 1, 5500],
    ['2026-01-10', 0, 4500], ['2026-01-05', 1, 5000],
  ]
  const staffNames = ['山田', '佐々木']
  return raw.map(([date, si, price]) => ({
    visit_date: date,
    staff_name: staffNames[si],
    price,
    checkin_at: null,
    checkout_at: null,
  }))
}

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`
}

export default async function StoreSalesPage() {
  let visits: VisitRecord[]

  if (!isSupabaseConfigured) {
    visits = getDemoVisits()
  } else {
    const supabase = await createClient()
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const startDate = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`

    const { data } = await supabase
      .from('visit_history')
      .select('visit_date, staff_name, price, checkin_at, checkout_at')
      .gte('visit_date', startDate)
      .order('visit_date', { ascending: false })

    visits = (data || []) as VisitRecord[]
  }

  // 今月のデータ
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonthVisits = visits.filter((v) => v.visit_date.startsWith(thisMonth))

  const staffSummary = aggregateByStaff(currentMonthVisits)
  const monthlySummary = aggregateByMonth(visits)

  const monthRevenue = currentMonthVisits.reduce((sum, v) => sum + (v.price || 0), 0)
  const monthCount = currentMonthVisits.length
  const monthAvgPrice = monthCount > 0 ? Math.round(monthRevenue / monthCount) : 0
  const durVisits = currentMonthVisits
    .map((v) => calcDurationMin(v.checkin_at, v.checkout_at))
    .filter((d): d is number => d !== null)
  const monthAvgDuration = durVisits.length > 0
    ? Math.round(durVisits.reduce((sum, d) => sum + d, 0) / durVisits.length)
    : null

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <TrendingUp className="h-6 w-6" />
        店舗売上実績
      </h2>

      {/* KPIカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">今月の売上</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(monthRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">今月の客数</p>
            <p className="text-2xl font-bold mt-1">
              {monthCount}<span className="text-sm font-normal text-muted-foreground ml-1">人</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">客単価</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(monthAvgPrice)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">平均施術時間</p>
            <p className="text-2xl font-bold mt-1">
              {monthAvgDuration ? `${monthAvgDuration}分` : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* スタッフ別実績 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">スタッフ別実績（今月）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>スタッフ</TableHead>
                  <TableHead className="text-right">売上</TableHead>
                  <TableHead className="text-center">客数</TableHead>
                  <TableHead className="text-right">客単価</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffSummary.length > 0 ? (
                  staffSummary.map((s) => (
                    <TableRow key={s.staffName}>
                      <TableCell className="font-medium">{s.staffName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.revenue)}</TableCell>
                      <TableCell className="text-center">{s.count}人</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.avgPrice)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                      データがありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 月別実績 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">月別実績</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>月</TableHead>
                  <TableHead className="text-right">売上</TableHead>
                  <TableHead className="text-center">客数</TableHead>
                  <TableHead className="text-right">客単価</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlySummary.length > 0 ? (
                  monthlySummary.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell>{m.label}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.revenue)}</TableCell>
                      <TableCell className="text-center">{m.count}人</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.avgPrice)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                      データがありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
