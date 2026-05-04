'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface DeliveryAttribution {
  templateType: string
  /** 集計対象期間（日数） */
  rangeDays: number
  /** 配信〜来店の判定窓（日数） */
  windowDays: number
  /** 集計対象期間内の配信成功数 */
  totalSent: number
  /** うち、判定窓内に来店した件数 */
  totalAttributed: number
  /** 来店率（%, 小数1桁） */
  attributionRate: number
  /** 該当来店の price 合計（売上貢献推定） */
  totalRevenue: number
  /** 直近の成功事例（最大10件） */
  recentExamples: Array<{
    customerCode: string | null
    customerName: string
    sentAt: string
    visitDate: string
    daysToVisit: number
    price: number | null
  }>
}

/**
 * 指定テンプレートの配信から N日以内の来店を集計する。
 *
 * 例: maintenance_1 を 30日窓で計測 → 過去90日の配信のうち
 *     30日以内に customer が来店したものを「アトリビューション成功」扱い。
 *
 * 注意:
 *   thank_you 系（来店後送信）は性質的に意味がないが、技術的には集計可能。
 *   呼び出し側でスキップする想定。
 */
export async function getDeliveryAttribution(
  templateType: string,
  windowDays: number = 30,
  rangeDays: number = 90
): Promise<DeliveryAttribution> {
  const admin = createAdminClient()
  const now = new Date()
  const fromDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000)

  // 1. 集計対象期間の配信成功レコード取得
  const { data: sends } = await admin
    .from('line_message_history')
    .select(
      'id, customer_id, sent_at, customer:customer_id(customer_code, name)'
    )
    .eq('message_type', templateType)
    .eq('status', 'sent')
    .gte('sent_at', fromDate.toISOString())
    .order('sent_at', { ascending: false })

  if (!sends || sends.length === 0) {
    return {
      templateType,
      rangeDays,
      windowDays,
      totalSent: 0,
      totalAttributed: 0,
      attributionRate: 0,
      totalRevenue: 0,
      recentExamples: [],
    }
  }

  // 2. 該当顧客の visit_history を一括取得（範囲を広めに）
  const customerIds = Array.from(
    new Set(sends.map((s) => s.customer_id as string).filter(Boolean))
  )
  if (customerIds.length === 0) {
    return {
      templateType,
      rangeDays,
      windowDays,
      totalSent: sends.length,
      totalAttributed: 0,
      attributionRate: 0,
      totalRevenue: 0,
      recentExamples: [],
    }
  }

  const visitFromDate = new Date(fromDate.getTime() - 1 * 24 * 60 * 60 * 1000)
  const visitToDate = new Date(
    now.getTime() + windowDays * 24 * 60 * 60 * 1000
  )

  const { data: visits } = await admin
    .from('visit_history')
    .select('customer_id, visit_date, price')
    .in('customer_id', customerIds)
    .gte('visit_date', visitFromDate.toISOString().slice(0, 10))
    .lte('visit_date', visitToDate.toISOString().slice(0, 10))
    .order('visit_date', { ascending: true })

  // customer_id ごとの visit を昇順リスト化
  const visitsByCustomer = new Map<
    string,
    Array<{ visit_date: string; price: number | null }>
  >()
  for (const v of visits || []) {
    const cid = v.customer_id as string
    if (!visitsByCustomer.has(cid)) visitsByCustomer.set(cid, [])
    visitsByCustomer.get(cid)!.push({
      visit_date: v.visit_date as string,
      price: (v.price as number | null) ?? null,
    })
  }

  // 3. 各配信について「sent_at 以降〜windowDays以内の最初の来店」を探す
  let totalAttributed = 0
  let totalRevenue = 0
  const examples: DeliveryAttribution['recentExamples'] = []

  for (const send of sends) {
    const cid = send.customer_id as string
    const sentAt = new Date(send.sent_at as string)
    const sentDateStr = sentAt.toISOString().slice(0, 10)
    const windowEnd = new Date(
      sentAt.getTime() + windowDays * 24 * 60 * 60 * 1000
    )
    const windowEndStr = windowEnd.toISOString().slice(0, 10)

    const customerVisits = visitsByCustomer.get(cid) || []
    // sent_at の日付以降〜windowEnd 以内の最初の来店
    const attributedVisit = customerVisits.find(
      (v) => v.visit_date >= sentDateStr && v.visit_date <= windowEndStr
    )

    if (attributedVisit) {
      totalAttributed++
      totalRevenue += attributedVisit.price ?? 0

      // 直近10件を例として保持
      if (examples.length < 10) {
        const cust = send.customer as unknown as {
          customer_code: string | null
          name: string
        } | null
        const visitDate = new Date(attributedVisit.visit_date)
        const daysToVisit = Math.round(
          (visitDate.getTime() - sentAt.getTime()) / (24 * 60 * 60 * 1000)
        )
        examples.push({
          customerCode: cust?.customer_code ?? null,
          customerName: cust?.name ?? '不明',
          sentAt: send.sent_at as string,
          visitDate: attributedVisit.visit_date,
          daysToVisit: Math.max(0, daysToVisit),
          price: attributedVisit.price,
        })
      }
    }
  }

  const totalSent = sends.length
  const attributionRate =
    totalSent > 0
      ? Math.round((totalAttributed / totalSent) * 1000) / 10
      : 0

  return {
    templateType,
    rangeDays,
    windowDays,
    totalSent,
    totalAttributed,
    attributionRate,
    totalRevenue,
    recentExamples: examples,
  }
}
