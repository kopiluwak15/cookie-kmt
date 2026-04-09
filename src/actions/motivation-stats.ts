'use server'

import { createClient } from '@/lib/supabase/server'

export async function getMotivationStats(startDate: string | null, endDate: string | null) {
  const supabase = await createClient()

  let query = supabase
    .from('customer')
    .select('visit_motivation')
    .not('visit_motivation', 'is', null)

  // created_at（アンケート記入時点）で期間フィルタ
  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    // endDateの翌日を指定して当日を含める
    const end = new Date(endDate)
    end.setDate(end.getDate() + 1)
    query = query.lt('created_at', end.toISOString().split('T')[0])
  }

  const { data } = await query

  const counts: Record<string, number> = {}
  data?.forEach((c) => {
    const motivation = c.visit_motivation || 'その他'
    counts[motivation] = (counts[motivation] || 0) + 1
  })

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }))
}
