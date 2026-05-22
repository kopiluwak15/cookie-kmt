'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  suggestTreatments,
  hasAiSuggestConfigured,
  type SuggestionItem,
} from '@/lib/ai/suggest'

/**
 * AI 施術提案 Server Action
 *
 * 指定された顧客の：
 *  - 最新カルテ (karte_intake)
 *  - 最新お悩みアンケート (concept_intake)
 *  - 過去の自分の来店履歴 (visit_history)
 *  - 同じ悩みタグを持つ他お客様の症例 (case_records)
 *  - 提供可能なサービスメニュー (service_menu)
 *
 * を集めて Claude/OpenAI に渡し、施術提案 TOP3 を返す。
 */

export interface GetSuggestionsResult {
  ok: boolean
  suggestions?: SuggestionItem[]
  model?: string
  error?: string
  /** 提案根拠の透明性のため：何件の症例を参照したか */
  basis?: {
    pastVisits: number
    similarCases: number
    intakeFound: boolean
  }
}

export async function getTreatmentSuggestions(
  customerId: string
): Promise<GetSuggestionsResult> {
  if (!hasAiSuggestConfigured()) {
    return {
      ok: false,
      error: 'AI APIキーが設定されていません（.env.local の OPENAI_API_KEY or ANTHROPIC_API_KEY）',
    }
  }
  if (!customerId) {
    return { ok: false, error: '顧客IDが指定されていません' }
  }

  const admin = createAdminClient()

  // 1. 顧客基本情報
  const { data: customer } = await admin
    .from('customer')
    .select('id, name, total_visits')
    .eq('id', customerId)
    .single()

  if (!customer) {
    return { ok: false, error: '顧客が見つかりませんでした' }
  }

  // 2. 最新のカルテ・お悩みアンケート（直近30日）
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [karteRes, conceptRes, visitsRes] = await Promise.all([
    admin
      .from('karte_intake')
      .select('worries, worries_other, selected_menus, spots, history')
      .eq('customer_id', customerId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('concept_intake')
      .select('symptoms, symptoms_other, success_criteria, worries_free, priorities')
      .eq('customer_id', customerId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('visit_history')
      .select('visit_date, service_menu, notes')
      .eq('customer_id', customerId)
      .order('visit_date', { ascending: false })
      .limit(3),
  ])

  const karte = karteRes.data as {
    worries?: string[] | null
    worries_other?: string | null
    selected_menus?: string[] | null
    spots?: string[] | null
    history?: string[] | null
  } | null
  const concept = conceptRes.data as {
    symptoms?: string[] | null
    symptoms_other?: string | null
    success_criteria?: string[] | null
    worries_free?: string | null
    priorities?: string[] | null
  } | null
  const pastVisits = (visitsRes.data || []) as Array<{
    visit_date: string
    service_menu: string
    notes: string | null
  }>

  // 3. 悩みタグを集約（karte.worries + concept.symptoms から）
  const worries = [
    ...(karte?.worries ?? []),
    ...(concept?.symptoms ?? []),
  ]
  const worriesAll = [...new Set(worries)] // 重複除去

  // 4. 似た悩みを持つ他お客様の症例を引く
  let similarCases: Array<{
    concernTags: string[]
    treatmentTags: string[]
    aiSummary?: string | null
  }> = []
  if (worriesAll.length > 0) {
    // concern_tags が overlap する症例（最新10件）
    const { data: cases } = await admin
      .from('case_records')
      .select('concern_tags, treatment_tags, ai_summary')
      .overlaps('concern_tags', worriesAll)
      .neq('customer_id', customerId) // 自分自身を除く
      .order('created_at', { ascending: false })
      .limit(10)

    similarCases = (cases || []).map((c) => ({
      concernTags: (c.concern_tags as string[]) || [],
      treatmentTags: (c.treatment_tags as string[]) || [],
      aiSummary: c.ai_summary as string | null,
    }))
  }

  // 5. 提供可能なメニュー（active のみ）
  const { data: menus } = await admin
    .from('service_menus')
    .select('name, category, estimated_minutes, default_price, is_concept')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  const availableMenus = (menus || []).map((m) => ({
    name: m.name as string,
    category: m.category as string | null,
    estimatedMinutes: (m.estimated_minutes as number) || 60,
    price: m.default_price as number | null,
    isConcept: !!m.is_concept,
  }))

  if (availableMenus.length === 0) {
    return {
      ok: false,
      error: '提供メニューが登録されていません',
    }
  }

  if (worriesAll.length === 0 && !karte?.worries_other && !concept?.worries_free) {
    return {
      ok: false,
      error: 'お悩み情報が入力されていません。カルテ/お悩みアンケートを先にご記入ください',
    }
  }

  // 6. AIに渡す
  try {
    const result = await suggestTreatments({
      customerName: customer.name as string,
      visitCount: (customer.total_visits as number) ?? 0,
      worries: worriesAll,
      worriesFree:
        [karte?.worries_other, concept?.worries_free, concept?.symptoms_other]
          .filter(Boolean)
          .join(' / ') || null,
      symptoms: concept?.symptoms || [],
      successCriteria: concept?.success_criteria || [],
      selectedMenus: karte?.selected_menus || [],
      spots: karte?.spots || [],
      pastVisits: pastVisits.map((v) => ({
        date: v.visit_date,
        menu: v.service_menu,
        notes: v.notes,
      })),
      similarCases,
      availableMenus,
    })

    return {
      ok: true,
      suggestions: result.suggestions,
      model: result.model,
      basis: {
        pastVisits: pastVisits.length,
        similarCases: similarCases.length,
        intakeFound: !!karte || !!concept,
      },
    }
  } catch (e) {
    console.error('[ai-suggest] failed:', e)
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'AI提案の生成に失敗しました',
    }
  }
}
