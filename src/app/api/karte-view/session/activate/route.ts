import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** スマホ側: LINE認証+GPS確認後にセッションを有効化 */
export async function POST(req: NextRequest) {
  const { sessionCode, lineUserId } = (await req.json()) as {
    sessionCode?: string
    lineUserId?: string
  }

  if (!sessionCode || !lineUserId) {
    return NextResponse.json({ error: 'パラメータ不足です' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // スタッフ確認
  const { data: staff } = await supabase
    .from('staff')
    .select('id, is_active')
    .eq('line_user_id', lineUserId)
    .single()

  if (!staff || !staff.is_active) {
    return NextResponse.json({ error: 'スタッフとして登録されていません' }, { status: 403 })
  }

  // セッション存在＋期限チェック
  const { data: session } = await supabase
    .from('karte_sessions')
    .select('id, expires_at')
    .eq('session_code', sessionCode)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'セッションが見つかりません' }, { status: 404 })
  }

  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'セッションの期限が切れています' }, { status: 410 })
  }

  // 認証完了としてマーク
  const { error } = await supabase
    .from('karte_sessions')
    .update({
      staff_line_user_id: lineUserId,
      authenticated_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  if (error) {
    console.error('[karte-session] activate error:', error)
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
