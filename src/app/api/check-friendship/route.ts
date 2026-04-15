// LINE user ID を受け取り、公式LINEの友だち追加状態をサーバーサイドで判定する。
//
// LIFF の liff.getFriendship() は Android 版 LINE 内蔵ブラウザでハングする
// ケースがあるため、サーバーから LINE Profile API を叩いて判定する。
// LINE Profile API (GET /v2/bot/profile/{userId}) は友だち未追加ユーザーに
// 対して 404 を返すため、これで友だち状態を確実に判定できる。
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { lineUserId } = await req.json()
    if (!lineUserId || typeof lineUserId !== 'string') {
      return NextResponse.json({ error: 'lineUserId is required' }, { status: 400 })
    }

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json(
        { error: 'LINE_CHANNEL_ACCESS_TOKEN が設定されていません' },
        { status: 500 }
      )
    }

    // LINE Profile API: 友だち未追加なら 404
    const res = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 404) {
      // 未追加の場合、友達追加URLも一緒に返す
      // 環境変数優先、なければ LINE Bot Info API から basicId を取得
      const friendAddUrl = await resolveFriendAddUrl(token)
      return NextResponse.json({ isFriend: false, friendAddUrl })
    }

    if (res.ok) {
      // 友だち判定成功 → 既存顧客なら line_friend_date を更新
      try {
        const admin = createAdminClient()
        const { data: existing } = await admin
          .from('customer')
          .select('id, line_friend_date, line_blocked')
          .eq('line_user_id', lineUserId)
          .maybeSingle()
        if (existing) {
          const updates: Record<string, unknown> = {}
          if (!existing.line_friend_date) {
            updates.line_friend_date = new Date().toISOString()
          }
          if (existing.line_blocked) {
            updates.line_blocked = false
          }
          if (Object.keys(updates).length > 0) {
            await admin.from('customer').update(updates).eq('id', existing.id)
          }
        }
      } catch (e) {
        console.error('[check-friendship] update customer failed', e)
        // 更新失敗は判定結果に影響させない
      }
      return NextResponse.json({ isFriend: true })
    }

    // その他 (500等): fail-safe として未追加扱い（誤って通すよりは再試行を促す）
    const errBody = await res.text().catch(() => '')
    console.error('[check-friendship] unexpected status', res.status, errBody)
    const friendAddUrl = await resolveFriendAddUrl(token)
    return NextResponse.json({ isFriend: false, friendAddUrl, error: `line_api_${res.status}` })
  } catch (e) {
    console.error('[check-friendship] failed', e)
    return NextResponse.json({ isFriend: false, error: 'internal' }, { status: 500 })
  }
}

// 友達追加URLを解決する。
// 1. 環境変数 NEXT_PUBLIC_LINE_FRIEND_URL / LINE_FRIEND_URL があればそれを使用
// 2. なければ LINE Bot Info API で basicId を取得して URL を組み立てる
// 3. 全滅時は null
let cachedFriendAddUrl: { url: string; expires: number } | null = null
async function resolveFriendAddUrl(token: string): Promise<string | null> {
  const envUrl = process.env.NEXT_PUBLIC_LINE_FRIEND_URL || process.env.LINE_FRIEND_URL
  if (envUrl) return envUrl

  // 1時間キャッシュ
  if (cachedFriendAddUrl && cachedFriendAddUrl.expires > Date.now()) {
    return cachedFriendAddUrl.url
  }

  try {
    const res = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const info = (await res.json()) as { basicId?: string }
    if (!info.basicId) return null
    // basicId は "@xxxxx" 形式。URLエンコードして組み立てる
    const encoded = encodeURIComponent(info.basicId)
    const url = `https://line.me/R/ti/p/${encoded}`
    cachedFriendAddUrl = { url, expires: Date.now() + 60 * 60 * 1000 }
    return url
  } catch (e) {
    console.error('[check-friendship] bot info failed', e)
    return null
  }
}
