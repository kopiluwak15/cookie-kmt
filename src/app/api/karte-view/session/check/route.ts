import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** iPad側: セッションが認証済みかポーリングで確認 */
export async function POST(req: NextRequest) {
  const { sessionCode } = (await req.json()) as { sessionCode?: string }

  if (!sessionCode) {
    return NextResponse.json({ error: 'sessionCode が必要です' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data } = await supabase
    .from('karte_sessions')
    .select('staff_line_user_id, authenticated_at, expires_at')
    .eq('session_code', sessionCode)
    .single()

  if (!data) {
    return NextResponse.json({ authenticated: false, expired: true })
  }

  // 期限切れチェック
  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ authenticated: false, expired: true })
  }

  if (data.authenticated_at && data.staff_line_user_id) {
    return NextResponse.json({
      authenticated: true,
      staffLineUserId: data.staff_line_user_id,
    })
  }

  return NextResponse.json({ authenticated: false, expired: false })
}
