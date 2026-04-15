// 売上集計ユーティリティ
// - コンセプト売上 / レギュラー売上 の分離
// - コンセプトメニューが1つでも含まれるセットメニューは全額コンセプト売上として扱う
// - コンセプトメニュー税抜き金額の 5% をインセンティブ予測額として計算

import type { SupabaseClient } from '@supabase/supabase-js'

export const TAX_RATE = 0.1
export const CONCEPT_INCENTIVE_RATE = 0.05

export function toExTax(taxIncluded: number): number {
  return Math.round(taxIncluded / (1 + TAX_RATE))
}

export function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`
}

/** service_menus.is_concept = true のメニュー名集合を取得 */
export async function fetchConceptMenuNames(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const { data } = await supabase
    .from('service_menus')
    .select('name')
    .eq('is_concept', true)
  return new Set((data || []).map((m: { name: string }) => m.name.trim()))
}

/**
 * visit_history.service_menu (カンマ区切りテキスト) に
 * コンセプトメニューが1つでも含まれているかを判定する。
 * 区切り文字は "," と "、" の両方を許容、前後空白はトリム。
 */
export function isConceptVisit(
  serviceMenuText: string | null | undefined,
  conceptNames: Set<string>
): boolean {
  if (!serviceMenuText) return false
  if (conceptNames.size === 0) return false
  const items = serviceMenuText
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return items.some((item) => conceptNames.has(item))
}

export interface SalesSplit {
  /** 税込合計売上 */
  totalRevenue: number
  /** コンセプト売上（税込） */
  conceptRevenue: number
  /** レギュラー売上（税込） */
  regularRevenue: number
  /** コンセプト来店数 */
  conceptCount: number
  /** レギュラー来店数 */
  regularCount: number
  /** 総来店数 */
  totalCount: number
  /** コンセプト売上（税抜） */
  conceptRevenueExTax: number
  /** インセンティブ予測額 = コンセプト税抜 × 5% */
  conceptIncentive: number
}

/**
 * 来店履歴の配列を「コンセプト / レギュラー」に分割して集計する。
 * セットメニュー（コンセプト+レギュラー混在）はルール上コンセプト全額とする。
 */
export function splitSalesByConcept(
  visits: Array<{ price?: number | null; service_menu?: string | null }>,
  conceptNames: Set<string>
): SalesSplit {
  let totalRevenue = 0
  let conceptRevenue = 0
  let regularRevenue = 0
  let conceptCount = 0
  let regularCount = 0

  for (const v of visits) {
    const price = v.price || 0
    totalRevenue += price
    if (isConceptVisit(v.service_menu, conceptNames)) {
      conceptRevenue += price
      conceptCount += 1
    } else {
      regularRevenue += price
      regularCount += 1
    }
  }

  const conceptRevenueExTax = toExTax(conceptRevenue)
  const conceptIncentive = Math.round(conceptRevenueExTax * CONCEPT_INCENTIVE_RATE)

  return {
    totalRevenue,
    conceptRevenue,
    regularRevenue,
    conceptCount,
    regularCount,
    totalCount: visits.length,
    conceptRevenueExTax,
    conceptIncentive,
  }
}
