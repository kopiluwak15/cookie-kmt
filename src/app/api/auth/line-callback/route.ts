import { createHmac } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * LINE OAuth2 コールバック
 * state パラメータの HMAC 署名を検証し、mode を取得:
 *   "login" → LINEでログイン（line_user_id からスタッフ検索 → マジックリンク）
 *   "link"  → LINE連携（ログイン中スタッフに line_user_id を紐付け）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // エラーチェック
    if (error) {
      return NextResponse.redirect(new URL('/login?error=line_cancelled', request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/login?error=invalid_request', request.url))
    }

    // 環境変数
    const channelId = process.env.LINE_LOGIN_CHANNEL_ID
    const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET

    if (!channelId || !channelSecret) {
      return NextResponse.redirect(new URL('/login?error=config_error', request.url))
    }

    // HMAC署名付き state を検証
    // 形式: {nonce}.{mode}.{timestamp}.{uid}.{hmac}
    const parts = state.split('.')
    if (parts.length !== 5) {
      return NextResponse.redirect(new URL('/login?error=invalid_state', request.url))
    }

    const [nonce, mode, ts, uid, receivedHmac] = parts
    const payload = `${nonce}.${mode}.${ts}.${uid}`
    const expectedHmac = createHmac('sha256', channelSecret).update(payload).digest('base64url')

    if (receivedHmac !== expectedHmac) {
      console.error('[LINE OAuth] HMAC mismatch')
      const errorRedirect = mode === 'link' ? '/staff/performance?line_error=invalid_state' : '/login?error=invalid_state'
      return NextResponse.redirect(new URL(errorRedirect, request.url))
    }

    // タイムスタンプ検証（5分以内）
    const elapsed = Date.now() - parseInt(ts)
    if (isNaN(elapsed) || elapsed > 5 * 60 * 1000) {
      console.error('[LINE OAuth] state expired:', elapsed, 'ms')
      const errorRedirect = mode === 'link' ? '/staff/performance?line_error=invalid_state' : '/login?error=invalid_state'
      return NextResponse.redirect(new URL(errorRedirect, request.url))
    }

    // mode の検証
    const validMode = ['link', 'survey'].includes(mode) ? mode : 'login'

    // オリジン取得
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host
    const protoHeader = request.headers.get('x-forwarded-proto') || 'https'
    const protocol = protoHeader.split(',')[0].trim()
    const origin = `${protocol}://${host}`
    const redirectUri = `${origin}/api/auth/line-callback`

    // 1. 認可コードをアクセストークンに交換
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('[LINE OAuth] token exchange failed:', errText)
      const errorRedirect = validMode === 'link' ? '/staff/performance?line_error=token_failed' : '/login?error=token_failed'
      return NextResponse.redirect(new URL(errorRedirect, request.url))
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    // 2. LINEプロフィール取得
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!profileRes.ok) {
      const errorRedirect = validMode === 'link' ? '/staff/performance?line_error=profile_failed' : '/login?error=profile_failed'
      return NextResponse.redirect(new URL(errorRedirect, request.url))
    }

    const profile = await profileRes.json()
    const lineUserId = profile.userId

    console.log('[LINE OAuth] mode:', validMode, 'lineUserId:', lineUserId, 'displayName:', profile.displayName)

    // === モード別処理 ===
    if (validMode === 'link') {
      return await handleLink(request, lineUserId, uid)
    } else if (validMode === 'survey') {
      return await handleSurvey(request, lineUserId, profile.displayName, channelSecret)
    } else {
      return await handleLogin(request, lineUserId)
    }
  } catch (err) {
    console.error('[LINE OAuth] callback error:', err)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}

/**
 * LINE連携: スタッフに line_user_id を紐付ける
 * stateパラメータに含まれるauth_user_idを使用（Cookie不要）
 */
async function handleLink(request: NextRequest, lineUserId: string, authUserId: string) {
  if (!authUserId) {
    return NextResponse.redirect(new URL('/staff/performance?line_error=not_logged_in', request.url))
  }

  // DB操作はAdminクライアント（RLSにUPDATEポリシーがないため）
  const adminSupabase = createAdminClient()

  // 既に他のスタッフが使用していないかチェック
  const { data: existing } = await adminSupabase
    .from('staff')
    .select('id')
    .eq('line_user_id', lineUserId)
    .neq('auth_user_id', authUserId)
    .single()

  if (existing) {
    return NextResponse.redirect(new URL('/staff/performance?line_error=already_used', request.url))
  }

  // スタッフの line_user_id を更新
  const { data: updated, error: updateError } = await adminSupabase
    .from('staff')
    .update({ line_user_id: lineUserId })
    .eq('auth_user_id', authUserId)
    .select('id')
    .single()

  if (updateError || !updated) {
    console.error('[LINE Link] update failed:', updateError?.message || 'no matching staff')
    return NextResponse.redirect(new URL('/staff/performance?line_error=update_failed', request.url))
  }

  console.log('[LINE Link] success: staffId=', updated.id, 'lineUserId=', lineUserId)
  return NextResponse.redirect(new URL('/staff/performance?line_linked=1', request.url))
}

/**
 * LINEログイン: line_user_id からスタッフを検索してマジックリンクでログイン
 */
async function handleLogin(request: NextRequest, lineUserId: string) {
  const supabase = createAdminClient()

  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('auth_user_id, email, name')
    .eq('line_user_id', lineUserId)
    .eq('is_active', true)
    .single()

  if (staffError || !staff) {
    return NextResponse.redirect(new URL('/login?error=not_linked', request.url))
  }

  // マジックリンク生成
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: staff.email,
  })

  if (linkError || !linkData) {
    console.error('[LINE Login] magic link generation failed:', linkError)
    return NextResponse.redirect(new URL('/login?error=session_failed', request.url))
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('token_hash', linkData.properties.hashed_token)
  loginUrl.searchParams.set('type', 'magiclink')

  return NextResponse.redirect(loginUrl)
}

/**
 * アンケート/ルーレット: LINE user IDと表示名をHMAC署名付きで/surveyにリダイレクト
 */
async function handleSurvey(request: NextRequest, lineUserId: string, displayName: string, channelSecret: string) {
  // HMAC署名を生成してなりすまし防止
  const payload = `${lineUserId}.${displayName}`
  const sig = createHmac('sha256', channelSecret).update(payload).digest('base64url')

  const surveyUrl = new URL('/survey', request.url)
  surveyUrl.searchParams.set('line_uid', lineUserId)
  surveyUrl.searchParams.set('name', displayName)
  surveyUrl.searchParams.set('sig', sig)

  return NextResponse.redirect(surveyUrl)
}
