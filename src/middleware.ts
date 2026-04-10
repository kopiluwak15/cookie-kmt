import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const lowerPath = pathname.toLowerCase()

  // 認証不要パスは早期リターン（Supabaseクライアント生成をスキップ）
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/survey') ||
    pathname.startsWith('/walkin') ||
    pathname.startsWith('/counseling/fill') ||
    pathname.startsWith('/liff') ||
    pathname.startsWith('/karte-qr') ||
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/api/survey') ||
    pathname.startsWith('/api/walkin') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/karte') ||
    pathname.startsWith('/api/timecard') ||
    pathname.startsWith('/api/menus/active') ||
    pathname.startsWith('/menu/') ||
    pathname.startsWith('/recruit') ||
    lowerPath.endsWith('.html') ||
    lowerPath.endsWith('.png') ||
    lowerPath.endsWith('.jpg') ||
    lowerPath.endsWith('.jpeg') ||
    lowerPath.endsWith('.webp') ||
    lowerPath.endsWith('.gif') ||
    lowerPath.endsWith('.svg') ||
    lowerPath.endsWith('.ico')
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  // Supabase未設定時はスキップ（ローカル開発用）
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession() はローカルのCookieからJWTを読み取るだけ（ネットワーク通信なし）
  // → getUser() と違いSupabaseサーバーへの問い合わせが不要で高速
  // ※ 実際のユーザー検証は layout の getCachedStaffInfo() で getUser() が行う
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 未認証ユーザーをログインページにリダイレクト
  // 元のパスを ?next= に保存してログイン後に戻れるようにする
  if (!session) {
    const url = request.nextUrl.clone()
    const originalPath = pathname + request.nextUrl.search
    url.pathname = '/login'
    url.search = ''
    if (pathname !== '/' && pathname !== '/login') {
      url.searchParams.set('next', originalPath)
    }
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/cron).*)',
  ],
}
