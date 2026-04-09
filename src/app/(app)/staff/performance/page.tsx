import { createClient } from '@/lib/supabase/server'
import { getCachedStaffInfo } from '@/lib/cached-auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineLinkButton } from '@/components/features/line-link-button'
import { MonthlyVisitsTable } from '@/components/features/monthly-visits-table'
import {
  EMPLOYMENT_TYPE_LABELS,
  STAGE_DEFINITIONS,
  type EmploymentType,
  type Stage,
  type Staff,
} from '@/types'
import {
  calculateContractorCompensation,
  calculateS4Incentive,
  getStageAdvancementInfo,
} from '@/lib/salary-calculator'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

interface VisitRecord {
  visit_date: string
  price: number | null
  checkin_at: string | null
  checkout_at: string | null
  expected_duration_minutes: number | null
  service_menu: string | null
  customer_name: string | null
  style_name: string | null
}

interface MonthlyVisitDetail {
  visit_date: string
  customer_name: string
  service_menu: string
  style_name: string
  price: number
  duration: number | null
}

interface MonthlySummary {
  month: string
  label: string
  revenue: number
  count: number
  avgPrice: number
  avgDuration: number | null
  avg30min: number | null
  visits: MonthlyVisitDetail[]
}

function calcDurationMin(checkin: string | null, checkout: string | null): number | null {
  if (!checkin || !checkout) return null
  const diff = (new Date(checkout).getTime() - new Date(checkin).getTime()) / 60000
  return diff > 0 ? diff : null
}

function calc30min(dur: number | null, expected: number | null): number | null {
  if (!dur || dur <= 0 || !expected || expected <= 0) return null
  return Math.round((dur / expected) * 60 * 10) / 10
}

function aggregateByMonth(visits: VisitRecord[]): MonthlySummary[] {
  const map = new Map<string, { revenue: number; count: number; totalDur: number; durCount: number; total30: number; count30: number; details: MonthlyVisitDetail[] }>()

  visits.forEach((v) => {
    const month = v.visit_date.substring(0, 7)
    const entry = map.get(month) || { revenue: 0, count: 0, totalDur: 0, durCount: 0, total30: 0, count30: 0, details: [] }
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
    entry.details.push({
      visit_date: v.visit_date,
      customer_name: v.customer_name || '不明',
      service_menu: v.service_menu || '-',
      style_name: v.style_name || '-',
      price: v.price || 0,
      duration: dur,
    })
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
        visits: data.details.sort((a, b) => b.visit_date.localeCompare(a.visit_date)),
      }
    })
    .sort((a, b) => b.month.localeCompare(a.month))
}

function getDemoVisits(): VisitRecord[] {
  const demoNames = ['田中太郎', '佐藤健一', '山本大輔', '鈴木翔太', '高橋和也', '中村拓海', '小林直樹', '加藤雄太']
  const demoStyles = ['ツーブロック', '震災刈り', 'マッシュ', 'フェード', 'ショート']
  const demoMenus = ['カット', 'カット, ブラックカラー', 'カット, 眉カット', 'カット, ヘッドスパ']
  const raw: [string, number, number, number][] = [
    // 2026年3月
    ['2026-03-06', 4500, 10, 40], ['2026-03-05', 4500, 11, 35], ['2026-03-05', 4000, 15, 38],
    ['2026-03-04', 4000, 14, 40], ['2026-03-03', 4500, 13, 38],
    ['2026-03-02', 4500, 15, 40], ['2026-03-01', 4000, 13, 40], ['2026-03-01', 4500, 16, 35],
    // 2026年2月
    ['2026-02-28', 4500, 10, 38], ['2026-02-27', 4000, 11, 35],
    ['2026-02-25', 4500, 10, 40], ['2026-02-24', 4000, 15, 36],
    ['2026-02-21', 4500, 11, 38], ['2026-02-20', 4000, 13, 35],
    ['2026-02-18', 4500, 10, 40], ['2026-02-15', 4000, 15, 35],
    ['2026-02-13', 4500, 13, 38], ['2026-02-12', 4000, 14, 36],
    ['2026-02-08', 4500, 11, 40], ['2026-02-05', 4000, 15, 35],
    ['2026-02-03', 4500, 14, 38],
    // 2026年1月
    ['2026-01-31', 4500, 10, 40], ['2026-01-28', 4000, 14, 35],
    ['2026-01-25', 4500, 10, 38], ['2026-01-22', 4000, 15, 36],
    ['2026-01-18', 4500, 11, 40], ['2026-01-17', 4000, 13, 35],
    ['2026-01-14', 4500, 10, 38], ['2026-01-10', 4000, 15, 35],
    ['2026-01-07', 4500, 14, 40], ['2026-01-04', 4000, 11, 35],
    // 2025年12月
    ['2025-12-28', 4500, 10, 38], ['2025-12-25', 4000, 14, 35],
    ['2025-12-22', 4500, 10, 40], ['2025-12-19', 4000, 15, 36],
    ['2025-12-17', 4500, 11, 38], ['2025-12-15', 4000, 13, 35],
    ['2025-12-12', 4500, 10, 40], ['2025-12-08', 4000, 15, 35],
    ['2025-12-04', 4500, 14, 38], ['2025-12-01', 4000, 11, 35],
  ]

  return raw.map(([date, price, hour, dur], i) => ({
    visit_date: date,
    price,
    checkin_at: `${date}T${String(hour).padStart(2, '0')}:00:00`,
    checkout_at: `${date}T${String(hour).padStart(2, '0')}:${String(dur).padStart(2, '0')}:00`,
    expected_duration_minutes: 30 as number | null,
    customer_name: demoNames[i % demoNames.length],
    service_menu: demoMenus[i % demoMenus.length],
    style_name: demoStyles[i % demoStyles.length],
  }))
}

const TAX_RATE = 0.1

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`
}

function toExTax(taxIncluded: number): number {
  return Math.round(taxIncluded / (1 + TAX_RATE))
}

// デモ用スタッフ情報
function getDemoStaffInfo(): Pick<Staff, 'name' | 'employment_type' | 'stage' | 'base_salary' | 'hourly_rate' | 'commission_rate' | 'stage_started_at' | 'line_user_id'> {
  return {
    name: 'デモユーザー',
    employment_type: 'full_time',
    stage: 'S3',
    base_salary: 230000,
    hourly_rate: null,
    commission_rate: null,
    stage_started_at: '2025-06-01T00:00:00Z',
    line_user_id: null,
  }
}

// ステージバッジの色
function getStageBadgeClass(stage: Stage): string {
  switch (stage) {
    case 'S1': return 'bg-gray-500 text-white'
    case 'S2': return 'bg-green-600 text-white'
    case 'S3': return 'bg-blue-600 text-white'
    case 'S4': return 'bg-purple-600 text-white'
    case 'S5': return 'bg-amber-600 text-white'
    case 'S6': return 'bg-red-600 text-white'
  }
}

// 雇用形態バッジの色
function getEmploymentBadgeClass(type: EmploymentType): string {
  switch (type) {
    case 'full_time': return 'bg-blue-100 text-blue-800'
    case 'part_time': return 'bg-green-100 text-green-800'
    case 'contractor': return 'bg-amber-100 text-amber-800'
  }
}

export default async function StaffPerformancePage() {
  let staffInfo: ReturnType<typeof getDemoStaffInfo>
  let isLineLinked = false
  let authUserId: string | undefined
  let visits: VisitRecord[]

  if (!isSupabaseConfigured) {
    staffInfo = getDemoStaffInfo()
    visits = getDemoVisits()
  } else {
    const currentStaff = await getCachedStaffInfo()
    if (!currentStaff) redirect('/login')
    staffInfo = {
      name: currentStaff.name,
      employment_type: currentStaff.employment_type,
      stage: currentStaff.stage,
      base_salary: currentStaff.base_salary,
      hourly_rate: currentStaff.hourly_rate,
      commission_rate: currentStaff.commission_rate,
      stage_started_at: currentStaff.stage_started_at,
      line_user_id: currentStaff.line_user_id,
    }
    isLineLinked = !!currentStaff.line_user_id
    authUserId = currentStaff.auth_user_id

    const supabase = await createClient()
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const startDate = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`

    const { data } = await supabase
      .from('visit_history')
      .select('visit_date, price, checkin_at, checkout_at, expected_duration_minutes, service_menu, customer_id, style_category_id')
      .eq('staff_name', staffInfo.name)
      .gte('visit_date', startDate)
      .order('visit_date', { ascending: false })

    // 顧客名・スタイル名を個別に取得
    const customerIds = [...new Set((data || []).map((v: Record<string, unknown>) => v.customer_id as string))]
    const styleIds = [...new Set((data || []).map((v: Record<string, unknown>) => v.style_category_id as string))]

    const customerMap = new Map<string, string>()
    const styleMap = new Map<string, string>()

    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from('customer')
        .select('id, name')
        .in('id', customerIds)
      customers?.forEach((c: { id: string; name: string }) => customerMap.set(c.id, c.name))
    }
    if (styleIds.length > 0) {
      const { data: styles } = await supabase
        .from('style_settings')
        .select('id, style_name')
        .in('id', styleIds)
      styles?.forEach((s: { id: string; style_name: string }) => styleMap.set(s.id, s.style_name))
    }

    visits = (data || []).map((v: Record<string, unknown>) => ({
      visit_date: v.visit_date as string,
      price: v.price as number | null,
      checkin_at: v.checkin_at as string | null,
      checkout_at: v.checkout_at as string | null,
      expected_duration_minutes: v.expected_duration_minutes as number | null,
      service_menu: v.service_menu as string | null,
      customer_name: customerMap.get(v.customer_id as string) ?? null,
      style_name: styleMap.get(v.style_category_id as string) ?? null,
    }))
  }

  // 今月のデータ
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonthVisits = visits.filter((v) => v.visit_date.startsWith(thisMonth))

  // 先月のデータ（S4インセンティブ判定用）
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
  const lastMonthVisits = visits.filter((v) => v.visit_date.startsWith(lastMonth))
  const lastMonthRevenue = lastMonthVisits.reduce((sum, v) => sum + (v.price || 0), 0)
  const lastMonthRevenueExTax = toExTax(lastMonthRevenue)

  // 今月のKPI（税込）
  const monthRevenue = currentMonthVisits.reduce((sum, v) => sum + (v.price || 0), 0)
  // 今月のKPI（税抜）- 給与計算用
  const monthRevenueExTax = toExTax(monthRevenue)
  const monthCount = currentMonthVisits.length
  const monthAvgPrice = monthCount > 0 ? Math.round(monthRevenue / monthCount) : 0
  const monthAvgPriceExTax = monthCount > 0 ? Math.round(monthRevenueExTax / monthCount) : 0
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

  // 雇用形態情報
  const employmentType = staffInfo.employment_type
  const stage = staffInfo.stage
  const commissionRate = staffInfo.commission_rate ?? 0.4
  const baseSalary = staffInfo.base_salary
  const hourlyRate = staffInfo.hourly_rate

  // 月別集計
  const monthlySummary = aggregateByMonth(visits)

  // ステージ定義取得
  const stageDef = stage ? STAGE_DEFINITIONS.find(s => s.stage === stage) : null

  // 昇格情報（正社員のみ）- 税抜ベース
  const advancementInfo = employmentType === 'full_time' && stage
    ? getStageAdvancementInfo(stage, monthRevenueExTax, lastMonthRevenueExTax > 0 ? lastMonthRevenueExTax : null)
    : null

  // S4インセンティブ（正社員S4のみ）- 税抜ベース
  const s4Incentive = employmentType === 'full_time' && stage === 'S4'
    ? calculateS4Incentive(monthRevenueExTax, lastMonthRevenueExTax > 0 ? lastMonthRevenueExTax : null)
    : null

  // 業務委託報酬 - 税抜ベース
  const contractorComp = employmentType === 'contractor'
    ? calculateContractorCompensation(monthRevenueExTax, commissionRate)
    : null

  return (
    <div className="space-y-6">
      {/* ヘッダー: 名前+ステージバッジ */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-bold">マイ実績</h2>
        {employmentType && (
          <Badge className={getEmploymentBadgeClass(employmentType)}>
            {EMPLOYMENT_TYPE_LABELS[employmentType]}
          </Badge>
        )}
        {stage && stageDef && (
          <Badge className={getStageBadgeClass(stage)}>
            {stage} {stageDef.label}
          </Badge>
        )}
      </div>

      {!isSupabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          デモモードで表示中です。実際にログインすると自分の実績が表示されます。
        </div>
      )}

      {/* 今月のKPI */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">今月の売上（税込）</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(monthRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">税抜 {formatCurrency(monthRevenueExTax)}</p>
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
            <p className="text-sm text-muted-foreground">客単価（税込）</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(monthAvgPrice)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">税抜 {formatCurrency(monthAvgPriceExTax)}</p>
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
              <p className="text-sm text-muted-foreground">平均60分基準タイム</p>
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

      {/* ========== 報酬カード: 雇用形態別 ========== */}

      {/* 業務委託: 歩合・源泉・手取り */}
      {employmentType === 'contractor' && contractorComp && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-800">今月の報酬予測</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">税抜売上</span>
                <span className="text-lg font-semibold">{formatCurrency(monthRevenueExTax)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">歩合（{Math.round(commissionRate * 100)}%）</span>
                <span className="text-lg font-semibold">{formatCurrency(contractorComp.grossCommission)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">源泉徴収（10.21%）</span>
                <span className="text-lg font-semibold text-red-600">-{formatCurrency(contractorComp.withholdingTax)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-baseline">
                <span className="text-sm font-medium">手取り予測</span>
                <span className="text-3xl font-bold text-blue-700">{formatCurrency(contractorComp.netEstimate)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 正社員 S1〜S3: 基本給 + 目標売上プログレスバー */}
      {employmentType === 'full_time' && stage && ['S1', 'S2', 'S3'].includes(stage) && stageDef && advancementInfo && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-800">給与・昇格情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">基本給</span>
                <span className="text-2xl font-bold text-blue-700">{formatCurrency(baseSalary ?? stageDef.baseSalary)}</span>
              </div>

              {stageDef.targetRevenue && (
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm text-muted-foreground">
                      {advancementInfo.nextStage}昇格条件: {advancementInfo.criteria}
                    </span>
                    <span className="text-sm font-medium">
                      {Math.round(advancementInfo.progress * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        advancementInfo.eligible ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(advancementInfo.progress * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      現在（税抜）: {formatCurrency(monthRevenueExTax)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      目標: {formatCurrency(stageDef.targetRevenue)}
                    </span>
                  </div>
                  {advancementInfo.eligible && (
                    <div className="mt-2 bg-green-100 text-green-800 text-sm rounded-lg p-2 text-center">
                      🎉 昇格条件を達成しました！
                    </div>
                  )}
                </div>
              )}

              {stageDef.laborCostRatio && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  人件費率目安: {Math.round(stageDef.laborCostRatio * 100)}%
                  （基本給 {formatCurrency(baseSalary ?? stageDef.baseSalary)} ÷ 目標売上 {formatCurrency(stageDef.targetRevenue ?? 0)}）
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 正社員 S4: 基本給 + インセンティブ */}
      {employmentType === 'full_time' && stage === 'S4' && s4Incentive && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-purple-800">給与・インセンティブ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">基本給</span>
                <span className="text-xl font-semibold">{formatCurrency(baseSalary ?? 230000)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">
                  売上インセンティブ
                </span>
                <span className={`text-xl font-semibold ${s4Incentive.eligible ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {s4Incentive.eligible ? formatCurrency(s4Incentive.incentive) : formatCurrency(0)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                条件: 月売上¥600,000超過を2ヶ月連続 → 超過分の10%
              </div>
              <div className={`text-sm rounded-lg p-2 text-center ${
                s4Incentive.eligible
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {s4Incentive.reason}
              </div>
              {s4Incentive.eligible && (
                <div className="border-t pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-medium">今月合計</span>
                  <span className="text-2xl font-bold text-purple-700">
                    {formatCurrency((baseSalary ?? 230000) + s4Incentive.incentive)}
                  </span>
                </div>
              )}

              {/* S5昇格条件 */}
              {advancementInfo && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground">
                    次のステージ: S5（{advancementInfo.criteria}）
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 正社員 S5・S6: 基本給のみ */}
      {employmentType === 'full_time' && stage && ['S5', 'S6'].includes(stage) && stageDef && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-800">給与情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">基本給</span>
                <span className="text-2xl font-bold text-blue-700">{formatCurrency(baseSalary ?? stageDef.baseSalary)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {stage === 'S5' ? '役職手当込み' : 'エリアマネージャー（別途報酬体系）'}
              </div>
              {advancementInfo && advancementInfo.nextStage && (
                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground">
                    次のステージ: {advancementInfo.nextStage}（{advancementInfo.criteria}）
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* パート: 時給表示 */}
      {employmentType === 'part_time' && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-green-800">勤務情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">時給</span>
                <span className="text-2xl font-bold text-green-700">
                  {hourlyRate ? formatCurrency(hourlyRate) : '-'}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">今月の施術数</span>
                <span className="text-lg font-semibold">
                  {monthCount}<span className="text-sm font-normal text-muted-foreground ml-1">件</span>
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">今月の売上</span>
                <span className="text-lg font-semibold">{formatCurrency(monthRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 雇用形態未設定 */}
      {!employmentType && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今月の歩合予測</p>
                <p className="text-3xl font-bold mt-1 text-blue-700">
                  {formatCurrency(Math.round(monthRevenue * 0.4))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  売上 {formatCurrency(monthRevenue)} × 歩合率 40%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LINE連携 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">LINE連携</CardTitle>
        </CardHeader>
        <CardContent>
          <LineLinkButton isLinked={isLineLinked} authUserId={authUserId} />
        </CardContent>
      </Card>

      {/* 月別実績（展開で入客一覧表示） */}
      <MonthlyVisitsTable
        monthlySummary={monthlySummary}
        employmentType={employmentType}
        commissionRate={commissionRate}
        baseSalary={baseSalary}
        compensationHeader={
          employmentType === 'contractor' ? '歩合予測' :
          employmentType === 'full_time' ? '基本給' : '報酬'
        }
      />
    </div>
  )
}
