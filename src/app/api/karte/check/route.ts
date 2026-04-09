// LINE userId から customer の有無を判定して遷移先を返す
// /liff/welcome から呼ばれる
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let body: { lineUserId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.lineUserId) {
    return NextResponse.json({ error: 'missing_line_user_id' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: customer } = await supabase
    .from('customer')
    .select('id, name, last_visit_date, line_blocked')
    .eq('line_user_id', body.lineUserId)
    .maybeSingle()

  if (!customer) {
    return NextResponse.json({ exists: false })
  }

  // チェックイン: last_visit_date を今日に更新 + ブロック解除
  const update: Record<string, unknown> = {
    last_visit_date: today,
    updated_at: new Date().toISOString(),
  }
  if (customer.line_blocked) update.line_blocked = false
  await supabase.from('customer').update(update).eq('id', customer.id)

  // 本日カルテ作成済 → さらに concept_intake 必要かを判定するため
  // visit_history に本日分があれば service_menu からコンセプトかチェック
  const { data: todayVisit } = await supabase
    .from('visit_history')
    .select('id, service_menu')
    .eq('customer_id', customer.id)
    .eq('visit_date', today)
    .maybeSingle()

  let needsConcept = false
  if (todayVisit?.service_menu) {
    const { data: menu } = await supabase
      .from('service_menus')
      .select('is_concept')
      .eq('name', todayVisit.service_menu)
      .maybeSingle()
    needsConcept = !!menu?.is_concept
  }

  return NextResponse.json({
    exists: true,
    customerId: customer.id,
    name: customer.name,
    needsConcept,
  })
}
