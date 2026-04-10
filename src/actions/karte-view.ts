'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedStaffInfo } from '@/lib/cached-auth'
import { signCounselingToken } from '@/lib/counseling/token'
import type { CaseRecord } from '@/types'

/** QR用のカルテ閲覧URLを発行 */
export async function issueKarteViewUrl(customerId: string) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { ok: false as const, error: 'ログインが必要です' }

  const token = signCounselingToken(customerId)
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kmt.cookie.hair'

  const url = liffId
    ? `https://liff.line.me/${liffId}?mode=karte&token=${encodeURIComponent(token)}`
    : `${appUrl}/liff/karte?token=${encodeURIComponent(token)}`

  return { ok: true as const, url }
}

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
