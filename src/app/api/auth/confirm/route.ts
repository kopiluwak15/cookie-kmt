import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * メール確認 / パスワードリセット用コールバックハンドラー
 * Supabaseからのリダイレクトを受け取り、コード交換を行う
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') || '/login'

  const supabase = await createClient()

  if (code) {
    // PKCE フロー: 認証コードをセッションに交換
    await supabase.auth.exchangeCodeForSession(code)
  } else if (token_hash && type) {
    // トークンハッシュフロー: OTP 検証
    await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'signup' | 'invite' | 'magiclink' | 'email',
    })
  }

  const origin = request.nextUrl.origin
  return NextResponse.redirect(new URL(next, origin))
}
