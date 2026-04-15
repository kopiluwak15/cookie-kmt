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
import { TrendingUp, Sparkles } from 'lucide-react'
import {
  fetchConceptMenuNames,
  splitSalesByConcept,
  formatCurrency,
} from '@/lib/sales-utils'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

interface VisitRecord {
  visit_date: string
  staff_name: string
  price: number | null
  service_menu: string | null
  checkin_at: string | null
  checkout_at: string | null
}

interface StaffSummary {
  staffName: string
  revenue: number
  conceptRevenue: number
  regularRevenue: number
  count: number
  avgPrice: number
  conceptIncentive: number
}

interface MonthlySummary {
  month: string
  label: string
  revenue: number
  conceptRevenue: number
  regularRevenue: number
  count: number
  avgPrice: number
}

function calcDurationMin(checkin: string | null, checkout: string | null): number | null {
  if (!checkin || !checkout) return null
  const diff = (new Date(checkout).getTime() - new Date(checkin).getTime()) / 60000
  return diff > 0 ? diff : null
}

function aggregateByStaff(visits: VisitRecord[], conceptNames: Set<string>): StaffSummary[] {
  const map = new Map<string, VisitRecord[]>()
  visits.forEach((v) => {
    const list = map.get(v.staff_name) || []
    list.push(v)
    map.set(v.staff_name, list)
  })
  return Array.from(map.entries())
    .map(([staffName, staffVisits]) => {
      const split = splitSalesByConcept(staffVisits, conceptNames)
      return {
        staffName,
        revenue: split.totalRevenue,
        conceptRevenue: split.conceptRevenue,
        regularRevenue: split.regularRevenue,
        count: split.totalCount,
        avgPrice: split.totalCount > 0 ? Math.round(split.totalRevenue / split.totalCount) : 0,
        conceptIncentive: split.conceptIncentive,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
}

function aggregateByMonth(visits: VisitRecord[], conceptNames: Set<string>): MonthlySummary[] {
  const map = new Map<string, VisitRecord[]>()
  visits.forEach((v) => {
    const month = v.visit_date.substring(0, 7)
    const list = map.get(month) || []
    list.push(v)
    map.set(month, list)
  })
  return Array.from(map.entries())
    .map(([month, monthVisits]) => {
      const split = splitSalesByConcept(monthVisits, conceptNames)
      const [y, m] = month.split('-')
      return {
        month,
        label: `${y}年${parseInt(m)}月`,
        revenue: split.totalRevenue,
        conceptRevenue: split.conceptRevenue,
        regularRevenue: split.regularRevenue,
        count: split.totalCount,
        avgPrice: split.totalCount > 0 ? Math.round(split.totalRevenue / split.totalCount) : 0,
      }
    })
    .sort((a, b) => b.month.localeCompare(a.month))
}

function getDemoVisits(): VisitRecord[] {
  const raw: [string, number, number, string][] = [
    ['2026-03-06', 0, 4500, 'カット'],
    ['2026-03-06', 1, 5000, 'カット, カラー'],
    ['2026-03-05', 1, 5000, 'カット'],
    ['2026-03-05', 0, 4500, 'カット'],
    ['2026-03-05', 0, 4000, '髪質改善'],
    ['2026-03-04', 0, 4000, 'カット'],
    ['2026-03-04', 1, 5500, 'カット, 髪質改善'],
    ['2026-03-03', 1, 5000, '縮毛矯正'],
    ['2026-03-03', 0, 4500, 'カット'],
    ['2026-03-02', 0, 4500, 'カット'],
    ['2026-03-02', 1, 5000, 'カット'],
    ['2026-03-01', 1, 5000, 'カット'],
    ['2026-03-01', 0, 4000, 'カット'],
    ['2026-03-01', 0, 4500, 'カット'],
  ]
  const staffNames = ['山田', '佐々木']
  return raw.map(([date, si, price, menu]) => ({
    visit_date: date,
    staff_name: staffNames[si],
    price,
    service_menu: menu,
    checkin_at: null,
    checkout_at: null,
  }))
}

function getDemoConceptNames(): Set<string> {
  return new Set(['髪質改善', '縮毛矯正'])
}

export default async function StoreSalesPage() {
  let visits: VisitRecord[]
  let conceptNames: Set<string>

  if (!isSupabaseConfigured) {
    visits = getDemoVisits()
    conceptNames = getDemoConceptNames()
  } else {
    const supabase = await createClient()
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const startDate = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`

    const { data } = await supabase
      .from('visit_history')
      .select('visit_date, staff_name, price, service_menu, checkin_at, checkout_at')
      .gte('visit_date', startDate)
      .order('visit_date', { ascending: false })

    visits = (data || []) as VisitRecord[]
    conceptNames = await fetchConceptMenuNames(supabase)
  }

  // 今月のデータ
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonthVisits = visits.filter((v) => v.visit_date.startsWith(thisMonth))

  const monthSplit = splitSalesByConcept(currentMonthVisits, conceptNames)
  const monthAvgPrice = monthSplit.totalCount > 0 ? Math.round(monthSplit.totalRevenue / monthSplit.totalCount) : 0
  const durVisits = currentMonthVisits
    .map((v) => calcDurationMin(v.checkin_at, v.checkout_at))
    .filter((d): d is number => d !== null)
  const monthAvgDuration = durVisits.length > 0
    ? Math.round(durVisits.reduce((sum, d) => sum + d, 0) / durVisits.length)
    : null

  const staffSummary = aggregateByStaff(currentMonthVisits, conceptNames)
  const monthlySummary = aggregateByMonth(visits, conceptNames)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <TrendingUp className="h-6 w-6" />
        店舗売上実績
      </h2>

      {/* 総合KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">今月の売上（合計）</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(monthSplit.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">今月の客数</p>
            <p className="text-2xl font-bold mt-1">
              {monthSplit.totalCount}<span className="text-sm font-normal text-muted-foreground ml-1">人</span>
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

      {/* コンセプト / レギュラー売上分離 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-700" />
              <p className="text-sm text-purple-800 font-medium">コンセプト売上（今月）</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-purple-900">
              {formatCurrency(monthSplit.conceptRevenue)}
            </p>
            <p className="text-xs text-purple-700 mt-0.5">
              {monthSplit.conceptCount}人 / 税抜 {formatCurrency(monthSplit.conceptRevenueExTax)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-700 font-medium">レギュラー売上（今月）</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">
              {formatCurrency(monthSplit.regularRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {monthSplit.regularCount}人
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 font-medium">インセンティブ予測（店舗全体）</p>
            <p className="text-2xl font-bold mt-1 text-amber-900">
              {formatCurrency(monthSplit.conceptIncentive)}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              コンセプト税抜 × 5%
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
                  <TableHead className="text-right">売上合計</TableHead>
                  <TableHead className="text-right">コンセプト</TableHead>
                  <TableHead className="text-right">レギュラー</TableHead>
                  <TableHead className="text-center">客数</TableHead>
                  <TableHead className="text-right">客単価</TableHead>
                  <TableHead className="text-right">インセンティブ予測</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffSummary.length > 0 ? (
                  staffSummary.map((s) => (
                    <TableRow key={s.staffName}>
                      <TableCell className="font-medium">{s.staffName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.revenue)}</TableCell>
                      <TableCell className="text-right text-purple-700">{formatCurrency(s.conceptRevenue)}</TableCell>
                      <TableCell className="text-right text-gray-700">{formatCurrency(s.regularRevenue)}</TableCell>
                      <TableCell className="text-center">{s.count}人</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.avgPrice)}</TableCell>
                      <TableCell className="text-right text-amber-700 font-semibold">
                        {formatCurrency(s.conceptIncentive)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
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
                  <TableHead className="text-right">売上合計</TableHead>
                  <TableHead className="text-right">コンセプト</TableHead>
                  <TableHead className="text-right">レギュラー</TableHead>
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
                      <TableCell className="text-right text-purple-700">{formatCurrency(m.conceptRevenue)}</TableCell>
                      <TableCell className="text-right text-gray-700">{formatCurrency(m.regularRevenue)}</TableCell>
                      <TableCell className="text-center">{m.count}人</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.avgPrice)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
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
