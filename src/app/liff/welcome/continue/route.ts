// JS が効かない Android LINE 内蔵ブラウザ向けの逃げ道。
// /liff/welcome からの <a href> 経由でここに来る。
// サーバーサイドで karte check を行い、適切な次画面に redirect する。
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const lid = url.searchParams.get('lid') || ''
  const dn = url.searchParams.get('dn') || ''
  const mode = url.searchParams.get('mode') || ''
  const origin = url.origin

  if (!lid) {
    return NextResponse.redirect(`${origin}/liff/welcome`)
  }

  const base = `lid=${encodeURIComponent(lid)}&dn=${encodeURIComponent(dn)}`

  // timecard / karte モードは友だち追加不要でそのまま遷移
  if (mode === 'timecard') {
    return NextResponse.redirect(`${origin}/liff/timecard?${base}`)
  }
  if (mode === 'karte') {
    const sc = url.searchParams.get('sc') || ''
    return NextResponse.redirect(`${origin}/liff/karte?lid=${encodeURIComponent(lid)}&sc=${encodeURIComponent(sc)}`)
  }

  // 通常フロー: カルテ有無 → 適切な画面へ
  try {
    const supabase = createAdminClient()
    const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { data: customer } = await supabase
      .from('customer')
      .select('id, line_blocked')
      .eq('line_user_id', lid)
      .maybeSingle()

    if (!customer) {
      return NextResponse.redirect(`${origin}/liff/register?${base}`)
    }

    const update: Record<string, unknown> = {
      last_visit_date: today,
      updated_at: new Date().toISOString(),
    }
    if (customer.line_blocked) update.line_blocked = false
    await supabase.from('customer').update(update).eq('id', customer.id)

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

    const cidParam = `&cid=${encodeURIComponent(customer.id)}`
    if (mode === 'concept' || needsConcept) {
      return NextResponse.redirect(`${origin}/liff/concept?${base}${cidParam}`)
    }
    return NextResponse.redirect(`${origin}/liff/thanks?${base}`)
  } catch (e) {
    console.error('continue redirect failed', e)
    return NextResponse.redirect(`${origin}/liff/thanks?${base}`)
  }
}
