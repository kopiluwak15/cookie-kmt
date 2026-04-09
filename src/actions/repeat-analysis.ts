'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { pushMessage } from '@/lib/line/client'
import { buildCustomMessage } from '@/lib/line/templates'

// ============================================
// 型定義
// ============================================

export type CategoryKey = 'new' | 'return' | 'regular' | 'winback'

export interface MonthData {
  offset: number
  label: string
  count: number
  cumulativeRate: number
  customerIds: string[]
}

export interface CategoryRow {
  key: CategoryKey
  label: string
  color: string
  visitCount: number
  ratio: number
  customerIds: string[]
  months: MonthData[]
  lost: {
    count: number
    rate: number
    customerIds: string[]
  }
}

export interface RepeatAnalysisResult {
  targetYear: number
  targetMonth: number
  categories: CategoryRow[]
  totals: {
    visitCount: number
    months: { offset: number; count: number; cumulativeRate: number }[]
    lost: { count: number; rate: number }
  }
}

export interface CellCustomerInfo {
  id: string
  customer_code: string
  name: string
  phone: string | null
  line_user_id: string | null
  line_blocked: boolean
  last_visit_date: string | null
}

// ============================================
// ユーティリティ
// ============================================

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return { start, end }
}

function addMonths(year: number, month: number, offset: number): [number, number] {
  let m = month + offset
  let y = year
  while (m > 12) {
    m -= 12
    y++
  }
  return [y, m]
}

function getMonthLabel(baseMonth: number, offset: number): string {
  const m = ((baseMonth - 1 + offset) % 12) + 1
  return `${m}月`
}

const CATEGORY_CONFIG: Record<
  CategoryKey,
  { label: string; color: string; order: number }
> = {
  new: { label: '新規', color: '#4CAF50', order: 0 },
  return: { label: '再来', color: '#FF9800', order: 1 },
  regular: { label: '固定', color: '#2196F3', order: 2 },
  winback: { label: 'リターン', color: '#9C27B0', order: 3 },
}

// ============================================
// リピート分析データ取得
// ============================================

export type MenuFilter = 'all' | 'concept'

export async function getRepeatAnalysis(
  year: number,
  month: number,
  menuFilter: MenuFilter = 'all'
): Promise<RepeatAnalysisResult> {
  const supabase = createAdminClient()
  const targetRange = getMonthRange(year, month)

  // コンセプトメニュー名一覧を取得（フィルタ用）
  let conceptMenuNames: string[] = []
  if (menuFilter === 'concept') {
    const { data: conceptMenus } = await supabase
      .from('service_menus')
      .select('name')
      .eq('is_concept', true)
    conceptMenuNames = (conceptMenus || []).map((m) => m.name)
    if (conceptMenuNames.length === 0) {
      return emptyResult(year, month)
    }
  }

  const matchesConcept = (serviceMenu: string | null): boolean => {
    if (menuFilter === 'all') return true
    if (!serviceMenu) return false
    return conceptMenuNames.some((n) => serviceMenu.includes(n))
  }

  // 対象月の来店者（ユニーク）を取得
  const { data: targetVisitsRaw } = await supabase
    .from('visit_history')
    .select('customer_id, service_menu')
    .gte('visit_date', targetRange.start)
    .lt('visit_date', targetRange.end)

  const targetVisits = (targetVisitsRaw || []) as Array<{
    customer_id: string
    service_menu: string | null
  }>

  const filteredTargetVisits = targetVisits.filter((v) => matchesConcept(v.service_menu))

  const uniqueIds = [...new Set(filteredTargetVisits.map((v) => v.customer_id))]

  if (uniqueIds.length === 0) {
    return emptyResult(year, month)
  }

  // 全来店履歴を取得（分類＆追跡用）
  const { data: rawAllVisits } = await supabase
    .from('visit_history')
    .select('customer_id, visit_date, service_menu')
    .in('customer_id', uniqueIds)
    .order('visit_date')

  if (!rawAllVisits) return emptyResult(year, month)

  // コンセプトモード時は service_menu でフィルタ（分類・追跡もコンセプト来店のみで判定）
  const allVisits = (rawAllVisits as Array<{
    customer_id: string
    visit_date: string
    service_menu: string | null
  }>).filter((v) => matchesConcept(v.service_menu))

  // 顧客別に来店日をグループ化
  const visitsByCustomer = new Map<string, string[]>()
  for (const v of allVisits) {
    const existing = visitsByCustomer.get(v.customer_id) || []
    existing.push(v.visit_date)
    visitsByCustomer.set(v.customer_id, existing)
  }

  // 顧客を分類
  const categorized: Record<CategoryKey, string[]> = {
    new: [],
    return: [],
    regular: [],
    winback: [],
  }

  for (const customerId of uniqueIds) {
    const visits = visitsByCustomer.get(customerId) || []
    const priorVisits = visits.filter((d) => d < targetRange.start)

    if (priorVisits.length === 0) {
      categorized.new.push(customerId)
    } else {
      const lastPrior = priorVisits[priorVisits.length - 1]
      const targetDate = new Date(targetRange.start)
      const lastDate = new Date(lastPrior)
      const monthsDiff =
        (targetDate.getFullYear() - lastDate.getFullYear()) * 12 +
        (targetDate.getMonth() - lastDate.getMonth())

      if (monthsDiff >= 6) {
        categorized.winback.push(customerId)
      } else if (priorVisits.length === 1) {
        categorized.return.push(customerId)
      } else {
        categorized.regular.push(customerId)
      }
    }
  }

  // 後続6ヶ月の来店追跡
  const monthRanges = [1, 2, 3, 4, 5, 6].map((offset) => {
    const [y, m] = addMonths(year, month, offset)
    return getMonthRange(y, m)
  })

  // カテゴリごとの結果を構築
  const categories: CategoryRow[] = []

  for (const key of ['new', 'return', 'regular', 'winback'] as CategoryKey[]) {
    const customerIds = categorized[key]
    const config = CATEGORY_CONFIG[key]
    const returnedSoFar = new Set<string>()
    const months: MonthData[] = []

    for (let i = 0; i < 6; i++) {
      const range = monthRanges[i]
      const newReturns: string[] = []

      for (const cid of customerIds) {
        if (returnedSoFar.has(cid)) continue
        const visits = visitsByCustomer.get(cid) || []
        const hasVisit = visits.some((d) => d >= range.start && d < range.end)
        if (hasVisit) {
          newReturns.push(cid)
          returnedSoFar.add(cid)
        }
      }

      months.push({
        offset: i + 1,
        label: `${i + 1}ヶ月後（${getMonthLabel(month, i + 1)}）`,
        count: newReturns.length,
        cumulativeRate:
          customerIds.length > 0
            ? Math.round((returnedSoFar.size / customerIds.length) * 1000) / 10
            : 0,
        customerIds: newReturns,
      })
    }

    const lostIds = customerIds.filter((id) => !returnedSoFar.has(id))

    categories.push({
      key,
      label: config.label,
      color: config.color,
      visitCount: customerIds.length,
      ratio:
        uniqueIds.length > 0
          ? Math.round((customerIds.length / uniqueIds.length) * 1000) / 10
          : 0,
      customerIds,
      months,
      lost: {
        count: lostIds.length,
        rate:
          customerIds.length > 0
            ? Math.round((lostIds.length / customerIds.length) * 1000) / 10
            : 0,
        customerIds: lostIds,
      },
    })
  }

  // 合計行の計算
  const totalReturned = [0, 0, 0, 0, 0, 0]
  const totalNewReturns = [0, 0, 0, 0, 0, 0]
  for (const cat of categories) {
    for (let i = 0; i < 6; i++) {
      totalNewReturns[i] += cat.months[i].count
    }
  }
  let cumulativeTotal = 0
  const totalMonths = totalNewReturns.map((count, i) => {
    cumulativeTotal += count
    totalReturned[i] = cumulativeTotal
    return {
      offset: i + 1,
      count,
      cumulativeRate:
        uniqueIds.length > 0
          ? Math.round((cumulativeTotal / uniqueIds.length) * 1000) / 10
          : 0,
    }
  })

  const totalLost = uniqueIds.length - cumulativeTotal

  return {
    targetYear: year,
    targetMonth: month,
    categories,
    totals: {
      visitCount: uniqueIds.length,
      months: totalMonths,
      lost: {
        count: totalLost,
        rate:
          uniqueIds.length > 0
            ? Math.round((totalLost / uniqueIds.length) * 1000) / 10
            : 0,
      },
    },
  }
}

function emptyResult(year: number, month: number): RepeatAnalysisResult {
  const emptyMonths = [1, 2, 3, 4, 5, 6].map((offset) => ({
    offset,
    label: `${offset}ヶ月後（${getMonthLabel(month, offset)}）`,
    count: 0,
    cumulativeRate: 0,
    customerIds: [],
  }))

  return {
    targetYear: year,
    targetMonth: month,
    categories: (['new', 'return', 'regular', 'winback'] as CategoryKey[]).map(
      (key) => ({
        key,
        label: CATEGORY_CONFIG[key].label,
        color: CATEGORY_CONFIG[key].color,
        visitCount: 0,
        ratio: 0,
        customerIds: [],
        months: emptyMonths.map((m) => ({ ...m, customerIds: [] })),
        lost: { count: 0, rate: 0, customerIds: [] },
      })
    ),
    totals: {
      visitCount: 0,
      months: emptyMonths.map(({ offset, count, cumulativeRate }) => ({
        offset,
        count,
        cumulativeRate,
      })),
      lost: { count: 0, rate: 0 },
    },
  }
}

// ============================================
// セル内の顧客詳細を取得
// ============================================

export async function getCellCustomers(
  customerIds: string[]
): Promise<CellCustomerInfo[]> {
  if (customerIds.length === 0) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('customer')
    .select(
      'id, customer_code, name, phone, line_user_id, line_blocked, last_visit_date'
    )
    .in('id', customerIds)
    .order('name')

  if (error) throw new Error(error.message)
  return data || []
}

// ============================================
// セルの顧客にLINE送信
// ============================================

export async function sendLineToCustomers(
  customerIds: string[],
  messageText: string
): Promise<{ sent: number; failed: number; blocked: number }> {
  if (customerIds.length === 0 || !messageText.trim()) {
    return { sent: 0, failed: 0, blocked: 0 }
  }

  const supabase = createAdminClient()

  // LINE送信可能な顧客を取得
  const { data: customers } = await supabase
    .from('customer')
    .select('id, name, line_user_id, line_blocked')
    .in('id', customerIds)
    .not('line_user_id', 'is', null)
    .eq('line_blocked', false)

  if (!customers || customers.length === 0) {
    return { sent: 0, failed: 0, blocked: 0 }
  }

  let sent = 0
  let failed = 0
  let blocked = 0

  for (const customer of customers) {
    try {
      const message = buildCustomMessage({
        customerName: customer.name,
        messageText,
      })

      const result = await pushMessage(customer.line_user_id!, [message])

      await supabase.from('line_message_history').insert({
        customer_id: customer.id,
        message_type: 'custom',
        line_request_id: result.requestId,
        status: 'sent',
      })

      sent++
    } catch (e) {
      const error = e as Error
      if (error.message === 'LINE_BLOCKED') {
        await supabase
          .from('customer')
          .update({ line_blocked: true })
          .eq('id', customer.id)
        await supabase.from('line_message_history').insert({
          customer_id: customer.id,
          message_type: 'custom',
          status: 'blocked',
        })
        blocked++
      } else {
        await supabase.from('line_message_history').insert({
          customer_id: customer.id,
          message_type: 'custom',
          status: 'failed',
          error_message: error.message,
        })
        failed++
      }
    }
  }

  return { sent, failed, blocked }
}
