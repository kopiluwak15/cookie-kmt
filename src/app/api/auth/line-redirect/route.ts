import { createHmac } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * LINE OAuth2 認可リクエスト
 * mode=link → LINE連携（スタッフが自分のLINEを紐付ける）
 * mode=login（デフォルト） → LINEでログイン
 *
 * CSRF対策: Cookie ではなく HMAC 署名付き state パラメータを使用
 * （Safari プライベートモードでは Cookie が保存されないため）
 */
export async function GET(request: NextRequest) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID
  if (!channelId) {
    return NextResponse.json({ error: 'LINE_LOGIN_CHANNEL_ID が設定されていません' }, { status: 500 })
  }

  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET
  if (!channelSecret) {
    return NextResponse.json({ error: 'LINE_LOGIN_CHANNEL_SECRET が設定されていません' }, { status: 500 })
  }

  // login, link, or survey
  const modeParam = request.nextUrl.searchParams.get('mode') || 'login'
  const mode = ['link', 'survey'].includes(modeParam) ? modeParam : 'login'
  const uid = request.nextUrl.searchParams.get('uid') || ''

  // HMAC署名付き state を生成（Cookie不要）
  // 形式: {nonce}.{mode}.{timestamp}.{uid}.{hmac}
  const nonce = crypto.randomUUID()
  const ts = Date.now().toString()
  const payload = `${nonce}.${mode}.${ts}.${uid}`
  const hmac = createHmac('sha256', channelSecret).update(payload).digest('base64url')
  const state = `${payload}.${hmac}`

  // 実際のホスト名からオリジンを取得
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host
  const protoHeader = request.headers.get('x-forwarded-proto') || 'https'
  const protocol = protoHeader.split(',')[0].trim()
  const origin = `${protocol}://${host}`
  const redirectUri = `${origin}/api/auth/line-callback`

  // LINE OAuth2 認可URLを構築
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: 'profile',
  })

  // surveyモード: LINE公式アカウントの友だち追加を同時に促す
  if (mode === 'survey') {
    params.set('bot_prompt', 'aggressive')
  }

  const authorizeUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`

  console.log('[LINE OAuth] mode:', mode)
  console.log('[LINE OAuth] channelId:', channelId, 'redirectUri:', redirectUri)

  return NextResponse.redirect(authorizeUrl)
}
