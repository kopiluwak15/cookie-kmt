// コンセプトメニュー詳細アンケート保存 API
// /liff/concept からPOSTされる
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  lineUserId?: string | null
  customerId?: string | null
  symptoms: string[]
  symptomsOther?: string
  lifeImpacts: string[]
  lifeOther?: string
  psychology: string[]
  pastExp: string[]
  successCriteria: string[]
  successFree?: string
  priorities: string[]
  worries?: string
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // customer 解決
  let customerId = body.customerId || null
  if (!customerId && body.lineUserId) {
    const { data } = await supabase
      .from('customer')
      .select('id')
      .eq('line_user_id', body.lineUserId)
      .maybeSingle()
    if (data) customerId = data.id
  }

  if (!customerId) {
    return NextResponse.json(
      { ok: false, error: 'customer_not_found' },
      { status: 404 }
    )
  }

  const { error } = await supabase.from('concept_intake').insert({
    customer_id: customerId,
    symptoms: body.symptoms,
    symptoms_other: body.symptomsOther || null,
    life_impacts: body.lifeImpacts,
    life_other: body.lifeOther || null,
    psychology: body.psychology,
    past_experiences: body.pastExp,
    success_criteria: body.successCriteria,
    success_free: body.successFree || null,
    priorities: body.priorities,
    worries_free: body.worries || null,
    raw: body,
  })

  if (error) {
    console.error('concept_intake insert failed', error)
    return NextResponse.json(
      { ok: false, error: 'concept_insert_failed', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
