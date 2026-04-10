import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

/** iPad側: 新しいセッションを生成してコードを返す */
export async function POST() {
  const supabase = createAdminClient()

  // 6文字のセッションコード生成
  const sessionCode = randomBytes(4).toString('hex').slice(0, 8)

  // 古いセッションを掃除（期限切れ）
  await supabase
    .from('karte_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())

  const { data, error } = await supabase
    .from('karte_sessions')
    .insert({
      session_code: sessionCode,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10分
    })
    .select('id, session_code')
    .single()

  if (error) {
    console.error('[karte-session] create error:', error)
    return NextResponse.json({ error: 'セッション作成に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ sessionCode: data.session_code })
}
