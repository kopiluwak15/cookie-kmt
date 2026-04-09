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
import { SalesFilter } from '@/components/features/sales-filter'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// ============================================
// 型定義
// ============================================

interface VisitRecord {
  visit_date: string
  staff_name: string
  price: number | null
  checkin_at: string | null
  checkout_at: string | null
  expected_duration_minutes: number | null
}

interface StaffSummary {
  staffName: string
  revenue: number
  count: number
  avgPrice: number
  avgDuration: number | null
  avg30min: number | null
}

interface DailySummary {
  date: string
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
  avgDuration: number | null
  avg30min: number | null
}

// ============================================
// 集計ロジック
// ============================================

function calcDurationMin(checkin: string | null, checkout: string | null): number | null {
  if (!checkin || !checkout) return null
  const diff = (new Date(checkout).getTime() - new Date(checkin).getTime()) / 60000
  return diff > 0 ? diff : null
}

function calc30min(dur: number | null, expected: number | null): number | null {
  if (!dur || dur <= 0 || !expected || expected <= 0) return null
  return Math.round((dur / expected) * 60 * 10) / 10
}

function aggregateByStaff(visits: VisitRecord[]): StaffSummary[] {
  const map = new Map<string, { revenue: number; count: number; totalDur: number; durCount: number; total30: number; count30: number }>()

  visits.forEach((v) => {
    const entry = map.get(v.staff_name) || { revenue: 0, count: 0, totalDur: 0, durCount: 0, total30: 0, count30: 0 }
    entry.revenue += v.price || 0
    entry.count += 1
    const dur = calcDurationMin(v.checkin_at, v.checkout_at)
    if (dur) {
      entry.totalDur += dur
      entry.durCount += 1
    }
    const n30 = calc30min(dur, v.expected_duration_minutes)
    if (n30 !== null) {
      entry.total30 += n30
      entry.count30 += 1
    }
    map.set(v.staff_name, entry)
  })

  return Array.from(map.entries())
    .map(([staffName, data]) => ({
      staffName,
      revenue: data.revenue,
      count: data.count,
      avgPrice: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
      avgDuration: data.durCount > 0 ? Math.round(data.totalDur / data.durCount) : null,
      avg30min: data.count30 > 0 ? Math.round(data.total30 / data.count30 * 10) / 10 : null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

function aggregateByDay(visits: VisitRecord[]): DailySummary[] {
  const map = new Map<string, { revenue: number; count: number }>()

  visits.forEach((v) => {
    const entry = map.get(v.visit_date) || { revenue: 0, count: 0 }
    entry.revenue += v.price || 0
    entry.count += 1
    map.set(v.visit_date, entry)
  })

  return Array.from(map.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      count: data.count,
      avgPrice: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

function aggregateByMonth(visits: VisitRecord[]): MonthlySummary[] {
  const map = new Map<string, { revenue: number; count: number; totalDur: number; durCount: number; total30: number; count30: number }>()

  visits.forEach((v) => {
    const month = v.visit_date.substring(0, 7) // "YYYY-MM"
    const entry = map.get(month) || { revenue: 0, count: 0, totalDur: 0, durCount: 0, total30: 0, count30: 0 }
    entry.revenue += v.price || 0
    entry.count += 1
    const dur = calcDurationMin(v.checkin_at, v.checkout_at)
    if (dur) {
      entry.totalDur += dur
      entry.durCount += 1
    }
    const n30 = calc30min(dur, v.expected_duration_minutes)
    if (n30 !== null) {
      entry.total30 += n30
      entry.count30 += 1
    }
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
        avgDuration: data.durCount > 0 ? Math.round(data.totalDur / data.durCount) : null,
        avg30min: data.count30 > 0 ? Math.round(data.total30 / data.count30 * 10) / 10 : null,
      }
    })
    .sort((a, b) => b.month.localeCompare(a.month))
}

// ============================================
// デモデータ
// ============================================

function getDemoVisits(): VisitRecord[] {
  // [date, staffIdx(0=山田,1=佐々木), price, hour, durationMin]
  const raw: [string, number, number, number, number][] = [
    // 2026年3月（今月）
    ['2026-03-06', 0, 4500, 10, 40], ['2026-03-06', 1, 5000, 14, 48],
    ['2026-03-05', 1, 5000, 13, 50], ['2026-03-05', 0, 4500, 11, 35], ['2026-03-05', 0, 4000, 15, 38],
    ['2026-03-04', 0, 4000, 14, 40], ['2026-03-04', 1, 5500, 10, 52],
    ['2026-03-03', 1, 5000, 10, 45], ['2026-03-03', 0, 4500, 13, 38],
    ['2026-03-02', 0, 4500, 15, 40], ['2026-03-02', 1, 5000, 11, 46],
    ['2026-03-01', 1, 5000, 10, 45], ['2026-03-01', 0, 4000, 13, 40], ['2026-03-01', 0, 4500, 16, 35],
    // 2026年2月
    ['2026-02-28', 0, 4500, 10, 38], ['2026-02-28', 1, 5000, 14, 48],
    ['2026-02-27', 0, 4000, 11, 35], ['2026-02-26', 1, 5500, 13, 52],
    ['2026-02-25', 0, 4500, 10, 40], ['2026-02-25', 1, 5000, 14, 45],
    ['2026-02-24', 0, 4000, 15, 36], ['2026-02-22', 1, 5500, 10, 50],
    ['2026-02-21', 0, 4500, 11, 38], ['2026-02-20', 0, 4000, 13, 35],
    ['2026-02-19', 1, 5000, 14, 48], ['2026-02-18', 0, 4500, 10, 40],
    ['2026-02-17', 1, 5000, 11, 46], ['2026-02-15', 0, 4000, 15, 35],
    ['2026-02-14', 1, 5500, 10, 52], ['2026-02-13', 0, 4500, 13, 38],
    ['2026-02-12', 0, 4000, 14, 36], ['2026-02-10', 1, 5000, 10, 45],
    ['2026-02-08', 0, 4500, 11, 40], ['2026-02-07', 1, 5500, 13, 50],
    ['2026-02-05', 0, 4000, 15, 35], ['2026-02-04', 1, 5000, 10, 46],
    ['2026-02-03', 0, 4500, 14, 38], ['2026-02-01', 1, 5000, 11, 45],
    // 2026年1月
    ['2026-01-31', 0, 4500, 10, 40], ['2026-01-30', 1, 5000, 13, 48],
    ['2026-01-28', 0, 4000, 14, 35], ['2026-01-27', 1, 5500, 11, 52],
    ['2026-01-25', 0, 4500, 10, 38], ['2026-01-24', 1, 5000, 14, 46],
    ['2026-01-22', 0, 4000, 15, 36], ['2026-01-20', 1, 5500, 10, 50],
    ['2026-01-18', 0, 4500, 11, 40], ['2026-01-17', 0, 4000, 13, 35],
    ['2026-01-15', 1, 5000, 14, 45], ['2026-01-14', 0, 4500, 10, 38],
    ['2026-01-13', 1, 5000, 11, 48], ['2026-01-10', 0, 4000, 15, 35],
    ['2026-01-08', 1, 5500, 10, 52], ['2026-01-07', 0, 4500, 14, 40],
    ['2026-01-06', 1, 5000, 13, 46], ['2026-01-04', 0, 4000, 11, 35],
    // 2025年12月
    ['2025-12-28', 0, 4500, 10, 38], ['2025-12-27', 1, 5500, 13, 52],
    ['2025-12-25', 0, 4000, 14, 35], ['2025-12-24', 1, 5000, 11, 46],
    ['2025-12-22', 0, 4500, 10, 40], ['2025-12-20', 1, 5000, 14, 48],
    ['2025-12-19', 0, 4000, 15, 36], ['2025-12-18', 1, 5500, 10, 50],
    ['2025-12-17', 0, 4500, 11, 38], ['2025-12-15', 0, 4000, 13, 35],
    ['2025-12-14', 1, 5000, 14, 45], ['2025-12-12', 0, 4500, 10, 40],
    ['2025-12-10', 1, 5000, 11, 48], ['2025-12-08', 0, 4000, 15, 35],
    ['2025-12-06', 1, 5500, 10, 52], ['2025-12-04', 0, 4500, 14, 38],
    ['2025-12-02', 1, 5000, 13, 46], ['2025-12-01', 0, 4000, 11, 35],
    // 2025年11月
    ['2025-11-29', 0, 4500, 10, 38], ['2025-11-28', 1, 5000, 14, 48],
    ['2025-11-26', 0, 4000, 11, 35], ['2025-11-25', 1, 5500, 13, 52],
    ['2025-11-22', 0, 4500, 10, 40], ['2025-11-20', 1, 5000, 14, 46],
    ['2025-11-18', 0, 4000, 15, 36], ['2025-11-17', 1, 5500, 10, 50],
    ['2025-11-15', 0, 4500, 11, 38], ['2025-11-14', 0, 4000, 13, 35],
    ['2025-11-12', 1, 5000, 14, 45], ['2025-11-10', 0, 4500, 10, 40],
    ['2025-11-08', 1, 5000, 11, 48], ['2025-11-06', 0, 4000, 15, 35],
    ['2025-11-04', 1, 5500, 10, 52], ['2025-11-01', 0, 4500, 14, 38],
    // 2025年10月
    ['2025-10-31', 0, 4500, 10, 40], ['2025-10-30', 1, 5000, 13, 48],
    ['2025-10-28', 0, 4000, 14, 35], ['2025-10-25', 1, 5500, 11, 52],
    ['2025-10-22', 0, 4500, 10, 38], ['2025-10-20', 1, 5000, 14, 46],
    ['2025-10-18', 0, 4000, 15, 36], ['2025-10-15', 1, 5500, 10, 50],
    ['2025-10-12', 0, 4500, 11, 40], ['2025-10-10', 0, 4000, 13, 35],
    ['2025-10-08', 1, 5000, 14, 45], ['2025-10-05', 0, 4500, 10, 38],
    ['2025-10-03', 1, 5000, 11, 48], ['2025-10-01', 0, 4000, 15, 35],
  ]

  const staffNames = ['山田', '佐々木']
  return raw.map(([date, si, price, hour, dur]) => ({
    visit_date: date,
    staff_name: staffNames[si],
    price,
    checkin_at: `${date}T${String(hour).padStart(2, '0')}:00:00`,
    checkout_at: `${date}T${String(hour).padStart(2, '0')}:${String(dur).padStart(2, '0')}:00`,
    expected_duration_minutes: 30 as number | null,
  }))
}

// ============================================
// データ取得
// ============================================

async function fetchSalesData(staffFilter?: string) {
  const supabase = await createClient()
  const now = new Date()

  // 過去12ヶ月分のデータを取得
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const startDate = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`

  let query = supabase
    .from('visit_history')
    .select('visit_date, staff_name, price, checkin_at, checkout_at, expected_duration_minutes')
    .gte('visit_date', startDate)
    .order('visit_date', { ascending: false })

  if (staffFilter && staffFilter !== 'all') {
    query = query.eq('staff_name', staffFilter)
  }

  const { data: visits } = await query

  // スタッフ一覧を取得
  const { data: staffData } = await supabase
    .from('staff')
    .select('name')
    .eq('is_active', true)
    .neq('role', 'admin')
    .order('name')

  const staffList = staffData?.map((s) => s.name) || []

  return {
    visits: (visits || []) as VisitRecord[],
    staffList,
  }
}

// ============================================
// フォーマット
// ============================================

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

// ============================================
// ページコンポーネント
// ============================================

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ staff?: string }>
}) {
  const { staff: staffFilter } = await searchParams

  let visits: VisitRecord[]
  let staffList: string[]

  if (!isSupabaseConfigured) {
    const allVisits = getDemoVisits()
    staffList = ['山田', '佐々木']

    // スタッフフィルター適用
    visits = staffFilter && staffFilter !== 'all'
      ? allVisits.filter((v) => v.staff_name === staffFilter)
      : allVisits
  } else {
    const data = await fetchSalesData(staffFilter)
    visits = data.visits
    staffList = data.staffList
  }

  // 今月のデータを抽出
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonthVisits = visits.filter((v) => v.visit_date.startsWith(thisMonth))

  // 集計
  const staffSummary = aggregateByStaff(currentMonthVisits)
  const dailySummary = aggregateByDay(currentMonthVisits)
  const monthlySummary = aggregateByMonth(visits)

  // 今月のKPI
  const monthRevenue = currentMonthVisits.reduce((sum, v) => sum + (v.price || 0), 0)
  const monthCount = currentMonthVisits.length
  const monthAvgPrice = monthCount > 0 ? Math.round(monthRevenue / monthCount) : 0
  const durVisits = currentMonthVisits
    .map((v) => calcDurationMin(v.checkin_at, v.checkout_at))
    .filter((d): d is number => d !== null)
  const monthAvgDuration = durVisits.length > 0
    ? Math.round(durVisits.reduce((sum, d) => sum + d, 0) / durVisits.length)
    : null

  // 60分基準の平均
  const norm30Visits = currentMonthVisits
    .map((v) => calc30min(calcDurationMin(v.checkin_at, v.checkout_at), v.expected_duration_minutes))
    .filter((d): d is number => d !== null)
  const monthAvg30min = norm30Visits.length > 0
    ? Math.round(norm30Visits.reduce((sum, d) => sum + d, 0) / norm30Visits.length * 10) / 10
    : null

  const filterLabel = staffFilter && staffFilter !== 'all' ? staffFilter : 'お店全体'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">売上実績</h2>
        <SalesFilter staffList={staffList} currentStaff={staffFilter || 'all'} />
      </div>

      {!isSupabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          デモモードで表示中です。Supabaseの認証情報を .env.local に設定すると実データが表示されます。
        </div>
      )}

      {/* KPIサマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">今月の売上</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(monthRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{filterLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">今月の客数</p>
            <p className="text-2xl font-bold mt-1">
              {monthCount}
              <span className="text-sm font-normal text-muted-foreground ml-1">人</span>
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

      {/* 60分基準 KPI */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">今月の平均60分基準タイム</p>
              <p className="text-3xl font-bold mt-1 text-amber-700">
                {monthAvg30min !== null ? `${monthAvg30min}分` : '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                メニュー推定時間を30分に正規化した施術効率（30分未満が効率的）
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* スタッフ別実績（お店全体表示時のみ） */}
      {(!staffFilter || staffFilter === 'all') && (
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
                    <TableHead className="text-center">平均タイム</TableHead>
                    <TableHead className="text-center">60分基準</TableHead>
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
                        <TableCell className="text-center">
                          {s.avgDuration ? `${s.avgDuration}分` : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.avg30min !== null ? `${s.avg30min}分` : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        データがありません
                      </TableCell>
                    </TableRow>
                  )}
                  {/* 合計行 */}
                  {staffSummary.length > 1 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>合計</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(staffSummary.reduce((sum, s) => sum + s.revenue, 0))}
                      </TableCell>
                      <TableCell className="text-center">
                        {staffSummary.reduce((sum, s) => sum + s.count, 0)}人
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(monthAvgPrice)}</TableCell>
                      <TableCell className="text-center">
                        {monthAvgDuration ? `${monthAvgDuration}分` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {monthAvg30min !== null ? `${monthAvg30min}分` : '-'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 日別実績 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">日別実績（今月）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead className="text-right">売上</TableHead>
                  <TableHead className="text-center">客数</TableHead>
                  <TableHead className="text-right">客単価</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailySummary.length > 0 ? (
                  dailySummary.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell>{formatDate(d.date)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(d.revenue)}</TableCell>
                      <TableCell className="text-center">{d.count}人</TableCell>
                      <TableCell className="text-right">{formatCurrency(d.avgPrice)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                      データがありません
                    </TableCell>
                  </TableRow>
                )}
                {/* 合計行 */}
                {dailySummary.length > 1 && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>合計</TableCell>
                    <TableCell className="text-right">{formatCurrency(monthRevenue)}</TableCell>
                    <TableCell className="text-center">{monthCount}人</TableCell>
                    <TableCell className="text-right">{formatCurrency(monthAvgPrice)}</TableCell>
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
                  <TableHead className="text-center">平均タイム</TableHead>
                  <TableHead className="text-center">60分基準</TableHead>
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
                      <TableCell className="text-center">
                        {m.avgDuration ? `${m.avgDuration}分` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {m.avg30min !== null ? `${m.avg30min}分` : '-'}
                      </TableCell>
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
