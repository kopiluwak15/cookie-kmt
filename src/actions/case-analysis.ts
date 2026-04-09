'use server'

import { createAdminClient } from '@/lib/supabase/admin'

// ============================================
// 症例蓄積サマリ
// ============================================
export interface CaseStatsResult {
  total: number
  withAiSummary: number
  concernRanking: Array<{ tag: string; count: number }>
  treatmentRanking: Array<{ tag: string; count: number }>
  topCombinations: Array<{ concern: string; treatment: string; count: number }>
  latestCreatedAt: string | null
}

export async function getCaseStats(): Promise<CaseStatsResult> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('case_records')
    .select('concern_tags, treatment_tags, ai_summary, created_at')
    .order('created_at', { ascending: false })

  if (error || !data) {
    return {
      total: 0,
      withAiSummary: 0,
      concernRanking: [],
      treatmentRanking: [],
      topCombinations: [],
      latestCreatedAt: null,
    }
  }

  type Row = {
    concern_tags: string[] | null
    treatment_tags: string[] | null
    ai_summary: string | null
    created_at: string
  }
  const rows = data as Row[]

  const concernCounts: Record<string, number> = {}
  const treatmentCounts: Record<string, number> = {}
  const comboCounts: Record<string, number> = {}

  for (const row of rows) {
    const concerns = row.concern_tags || []
    const treatments = row.treatment_tags || []
    for (const c of concerns) concernCounts[c] = (concernCounts[c] || 0) + 1
    for (const t of treatments) treatmentCounts[t] = (treatmentCounts[t] || 0) + 1
    for (const c of concerns) {
      for (const t of treatments) {
        const key = `${c}__${t}`
        comboCounts[key] = (comboCounts[key] || 0) + 1
      }
    }
  }

  const sortDesc = (entries: Array<[string, number]>) =>
    entries.sort((a, b) => b[1] - a[1])

  return {
    total: rows.length,
    withAiSummary: rows.filter((r) => !!r.ai_summary).length,
    concernRanking: sortDesc(Object.entries(concernCounts))
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count })),
    treatmentRanking: sortDesc(Object.entries(treatmentCounts))
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count })),
    topCombinations: sortDesc(Object.entries(comboCounts))
      .slice(0, 10)
      .map(([key, count]) => {
        const [concern, treatment] = key.split('__')
        return { concern, treatment, count }
      }),
    latestCreatedAt: rows[0]?.created_at || null,
  }
}

// ============================================
// 悩みタグ別リピート率
//   各症例について、同じ顧客が thresholdDays 以内に再来店したかを判定
// ============================================
export interface ConcernRepeatRow {
  tag: string
  cases: number
  repeated: number
  repeatRate: number // 0-100
}

export async function getConcernRepeatRates(
  thresholdDays = 60
): Promise<{ rows: ConcernRepeatRow[]; thresholdDays: number; basisCases: number }> {
  const admin = createAdminClient()

  // 1) 症例レコード + 紐付く visit の visit_date を取得
  const { data: caseRows, error: caseErr } = await admin
    .from('case_records')
    .select('id, customer_id, concern_tags, visit_history!inner(visit_date)')

  if (caseErr || !caseRows) {
    return { rows: [], thresholdDays, basisCases: 0 }
  }

  type CaseRow = {
    id: string
    customer_id: string
    concern_tags: string[] | null
    visit_history: { visit_date: string } | { visit_date: string }[]
  }
  const cases = caseRows as unknown as CaseRow[]

  // visit_date を平坦化
  const flatCases = cases.map((c) => {
    const vh = Array.isArray(c.visit_history) ? c.visit_history[0] : c.visit_history
    return {
      id: c.id,
      customer_id: c.customer_id,
      concern_tags: c.concern_tags || [],
      visit_date: vh?.visit_date || null,
    }
  })

  // 2) 関係する顧客の全 visit_date を一括取得
  const customerIds = Array.from(new Set(flatCases.map((c) => c.customer_id)))
  if (customerIds.length === 0) {
    return { rows: [], thresholdDays, basisCases: 0 }
  }
  const { data: allVisits } = await admin
    .from('visit_history')
    .select('customer_id, visit_date')
    .in('customer_id', customerIds)
    .order('visit_date', { ascending: true })

  type VisitRow = { customer_id: string; visit_date: string }
  const visitsByCustomer = new Map<string, string[]>()
  for (const v of (allVisits || []) as VisitRow[]) {
    if (!visitsByCustomer.has(v.customer_id)) {
      visitsByCustomer.set(v.customer_id, [])
    }
    visitsByCustomer.get(v.customer_id)!.push(v.visit_date)
  }

  // 3) 各症例について、閾値内の再来店があったかを判定
  const tagStats: Record<string, { cases: number; repeated: number }> = {}
  let basisCases = 0

  for (const c of flatCases) {
    if (!c.visit_date || c.concern_tags.length === 0) continue
    basisCases++
    const visits = visitsByCustomer.get(c.customer_id) || []
    const caseTime = new Date(c.visit_date).getTime()
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000
    const hasRepeat = visits.some((d) => {
      const t = new Date(d).getTime()
      return t > caseTime && t - caseTime <= thresholdMs
    })
    for (const tag of c.concern_tags) {
      if (!tagStats[tag]) tagStats[tag] = { cases: 0, repeated: 0 }
      tagStats[tag].cases++
      if (hasRepeat) tagStats[tag].repeated++
    }
  }

  const rows: ConcernRepeatRow[] = Object.entries(tagStats)
    .map(([tag, s]) => ({
      tag,
      cases: s.cases,
      repeated: s.repeated,
      repeatRate: s.cases > 0 ? Math.round((s.repeated / s.cases) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.cases - a.cases)

  return { rows, thresholdDays, basisCases }
}
