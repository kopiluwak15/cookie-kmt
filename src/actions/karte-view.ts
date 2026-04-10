'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { CaseRecord } from '@/types'

export interface KarteViewData {
  customer: {
    id: string
    customer_code: string | null
    name: string
    name_kana: string | null
    phone: string | null
    birthday: string | null
    notes: string | null
    individual_cycle_days: number | null
    first_visit_date: string | null
    last_visit_date: string | null
    total_visits: number
    visit_motivation: string | null
    line_user_id: string | null
    line_blocked: boolean
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visits: any[]
  caseRecords: CaseRecord[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  karteIntakes: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conceptIntakes: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineHistory: any[]
}

/** 顧客カルテの全データを取得（admin/customers/[id]/page.tsx と同じクエリ） */
export async function getKarteViewData(customerId: string): Promise<KarteViewData | null> {
  const admin = createAdminClient()

  const { data: customer } = await admin
    .from('customer')
    .select('*')
    .eq('id', customerId)
    .single()

  if (!customer) return null

  const [visitsRes, casesRes, karteRes, conceptRes, lineRes] = await Promise.all([
    admin
      .from('visit_history')
      .select('*, style_settings(style_name), expected_duration_minutes')
      .eq('customer_id', customerId)
      .order('visit_date', { ascending: false })
      .limit(20),
    admin
      .from('case_records')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('karte_intake')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('concept_intake')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('line_message_history')
      .select('*')
      .eq('customer_id', customerId)
      .order('sent_at', { ascending: false })
      .limit(20),
  ])

  return {
    customer,
    visits: visitsRes.data || [],
    caseRecords: (casesRes.data || []) as CaseRecord[],
    karteIntakes: karteRes.data || [],
    conceptIntakes: conceptRes.data || [],
    lineHistory: lineRes.data || [],
  }
}
