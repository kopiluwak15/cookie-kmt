// LIFF タイムカードからのお知らせ確認（LINE userId 経由でスタッフ特定）
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let body: { lineUserId?: string; announcementId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.lineUserId || !body.announcementId) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: staff, error: staffErr } = await supabase
    .from('staff')
    .select('id, is_active')
    .eq('line_user_id', body.lineUserId)
    .maybeSingle()

  if (staffErr) {
    return NextResponse.json({ error: staffErr.message }, { status: 500 })
  }
  if (!staff || !staff.is_active) {
    return NextResponse.json({ error: 'staff_not_found' }, { status: 404 })
  }

  const { error } = await supabase.from('announcement_reads').insert({
    announcement_id: body.announcementId,
    staff_id: staff.id,
  })

  // 既に確認済み（unique制約）のエラーは無視
  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
