'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { summarizeCase, hasAiConfigured } from '@/lib/ai/summarize'
import type { CaseRecord } from '@/types'

export interface CreateCaseRecordInput {
  visit_history_id: string
  customer_id: string
  concern_tags: string[]
  concern_raw?: string | null
  treatment_tags: string[]
  treatment_raw?: string | null
  satisfaction_self?: number | null
}

/**
 * 症例レコードを作成し、バックグラウンドで AI 要約を生成する。
 * - 入力が空（悩みタグも施術タグも自由記述も無し）の場合は何もせず null を返す
 * - 要約生成に失敗しても症例自体は保存される（要約は後で再実行可能）
 */
export async function createCaseRecord(
  input: CreateCaseRecordInput
): Promise<{ id: string } | null> {
  const hasContent =
    input.concern_tags.length > 0 ||
    input.treatment_tags.length > 0 ||
    !!input.concern_raw?.trim() ||
    !!input.treatment_raw?.trim()
  if (!hasContent) return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('case_records')
    .insert({
      visit_history_id: input.visit_history_id,
      customer_id: input.customer_id,
      concern_tags: input.concern_tags,
      concern_raw: input.concern_raw?.trim() || null,
      treatment_tags: input.treatment_tags,
      treatment_raw: input.treatment_raw?.trim() || null,
      satisfaction_self: input.satisfaction_self ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[case_records] insert failed:', error.message)
    return null
  }

  // AI 要約は「保存直後に逐次生成」。LINE と同様 fire-and-forget で
  // エラーが出ても来店ログ保存自体は失敗させない。
  if (hasAiConfigured()) {
    try {
      // 顧客コンテキストを取得
      const { data: customer } = await admin
        .from('customer')
        .select('total_visits')
        .eq('id', input.customer_id)
        .single()

      const result = await summarizeCase({
        concernTags: input.concern_tags,
        concernRaw: input.concern_raw,
        treatmentTags: input.treatment_tags,
        treatmentRaw: input.treatment_raw,
        customerContext: {
          visitCount: customer?.total_visits ?? undefined,
        },
      })

      await admin
        .from('case_records')
        .update({
          ai_summary: result.summary,
          ai_model: result.model,
          ai_summarized_at: new Date().toISOString(),
        })
        .eq('id', data.id)
    } catch (e) {
      console.error('[case_records] AI summarize failed:', e)
    }
  }

  return { id: data.id }
}

/**
 * 顧客の症例履歴を取得（古い→新しい順）
 */
export async function getCaseRecordsByCustomer(
  customerId: string
): Promise<CaseRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('case_records')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[case_records] select failed:', error.message)
    return []
  }
  return (data || []) as CaseRecord[]
}

/**
 * 指定タグの組み合わせで、リピート率を計算する（簡易版）。
 * 100症例達成判定などの土台。
 */
export async function getCaseTagStats(): Promise<{
  total: number
  byConcern: Record<string, number>
  byTreatment: Record<string, number>
}> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('case_records')
    .select('concern_tags, treatment_tags')

  if (error || !data) {
    return { total: 0, byConcern: {}, byTreatment: {} }
  }

  const byConcern: Record<string, number> = {}
  const byTreatment: Record<string, number> = {}
  for (const row of data as Array<{ concern_tags: string[]; treatment_tags: string[] }>) {
    for (const tag of row.concern_tags || []) {
      byConcern[tag] = (byConcern[tag] || 0) + 1
    }
    for (const tag of row.treatment_tags || []) {
      byTreatment[tag] = (byTreatment[tag] || 0) + 1
    }
  }
  return { total: data.length, byConcern, byTreatment }
}
