'use server'

import { createClient } from '@/lib/supabase/server'

export interface DashboardData {
  totalCustomers: number
  lineCustomers: number
  periodVisits: number
  dormantCustomers: number
  avgDuration: number
  lostCount: number
  periodRevenue: number
  lineStatsSummary: Record<string, { sent: number; total: number }>
  styleStats: Record<string, number>
  newCustomers: number
}

export async function getDashboardStats(startDate: string, endDate: string): Promise<DashboardData> {
  const supabase = await createClient()

  // endDateの翌日（当日を含めるため）
  const endNext = new Date(endDate)
  endNext.setDate(endNext.getDate() + 1)
  const endDateExclusive = endNext.toISOString().split('T')[0]

  const [
    { count: totalCustomers },
    { count: lineCustomers },
    { count: periodVisits },
    { count: dormantCustomers },
    { count: lostCount },
    { data: durVisits },
    { data: revenueData },
    { data: lineStats },
    { data: styleVisits },
    { count: newCustomers },
  ] = await Promise.all([
    // 総顧客数（全期間）
    supabase.from('customer').select('*', { count: 'exact', head: true }),
    // LINE連携顧客数（全期間）
    supabase.from('customer').select('*', { count: 'exact', head: true })
      .not('line_user_id', 'is', null).eq('line_blocked', false),
    // 期間内の来店数
    supabase.from('visit_history').select('*', { count: 'exact', head: true })
      .gte('visit_date', startDate).lt('visit_date', endDateExclusive),
    // 休眠顧客数 (90日以上、全期間)
    supabase.from('customer').select('*', { count: 'exact', head: true })
      .lt('last_visit_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .not('last_visit_date', 'is', null),
    // 失客予備軍（60〜90日、全期間）
    supabase.from('customer').select('*', { count: 'exact', head: true })
      .lt('last_visit_date', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .gte('last_visit_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .not('last_visit_date', 'is', null),
    // 施術時間データ（期間内）
    supabase.from('visit_history').select('checkin_at, checkout_at')
      .gte('visit_date', startDate).lt('visit_date', endDateExclusive)
      .not('checkin_at', 'is', null).not('checkout_at', 'is', null),
    // 期間内の売上
    supabase.from('visit_history').select('price')
      .gte('visit_date', startDate).lt('visit_date', endDateExclusive)
      .not('price', 'is', null),
    // LINE送信統計（期間内）
    supabase.from('line_message_history').select('message_type, status')
      .gte('sent_at', startDate).lt('sent_at', endDateExclusive),
    // スタイル別来店数（期間内）
    supabase.from('visit_history').select('style_category_id, style_settings(style_name)')
      .gte('visit_date', startDate).lt('visit_date', endDateExclusive),
    // 期間内の新規顧客数
    supabase.from('customer').select('*', { count: 'exact', head: true })
      .gte('created_at', startDate).lt('created_at', endDateExclusive),
  ])

  // 平均施術時間
  let avgDuration = 0
  if (durVisits && durVisits.length > 0) {
    const totalMin = durVisits.reduce((sum, v) => {
      const diff = (new Date(v.checkout_at).getTime() - new Date(v.checkin_at).getTime()) / 60000
      return diff > 0 ? sum + diff : sum
    }, 0)
    avgDuration = Math.round(totalMin / durVisits.length)
  }

  // 売上
  const periodRevenue = revenueData?.reduce((sum, v) => sum + ((v.price as number) || 0), 0) || 0

  // LINE送信統計
  const lineStatsSummary: Record<string, { sent: number; total: number }> = {
    thank_you: { sent: 0, total: 0 },
    reminder1: { sent: 0, total: 0 },
    reminder2: { sent: 0, total: 0 },
    dormant: { sent: 0, total: 0 },
  }
  lineStats?.forEach((record) => {
    const type = record.message_type as string
    if (lineStatsSummary[type]) {
      lineStatsSummary[type].total++
      if (record.status === 'sent') lineStatsSummary[type].sent++
    }
  })

  // スタイル別
  const styleStats: Record<string, number> = {}
  styleVisits?.forEach((v) => {
    const settings = v.style_settings as unknown as { style_name: string } | null
    const name = settings?.style_name || '不明'
    styleStats[name] = (styleStats[name] || 0) + 1
  })

  return {
    totalCustomers: totalCustomers || 0,
    lineCustomers: lineCustomers || 0,
    periodVisits: periodVisits || 0,
    dormantCustomers: dormantCustomers || 0,
    avgDuration,
    lostCount: lostCount || 0,
    periodRevenue,
    lineStatsSummary,
    styleStats,
    newCustomers: newCustomers || 0,
  }
}
