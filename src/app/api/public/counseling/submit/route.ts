// カウンセリング再アンケート 提出 API（トークンゲート版）
// /counseling/fill から POST される
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCounselingToken } from '@/lib/counseling/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  token?: string
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

  const verified = verifyCounselingToken(body.token)
  if (!verified) {
    return NextResponse.json(
      { ok: false, error: 'invalid_or_expired_token' },
      { status: 401 }
    )
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('concept_intake').insert({
    customer_id: verified.customerId,
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
    console.error('counseling submit insert failed', error)
    return NextResponse.json(
      { ok: false, error: 'insert_failed', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
