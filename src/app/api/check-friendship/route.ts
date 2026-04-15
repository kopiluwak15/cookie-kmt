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
      return NextResponse.json({ isFriend: false })
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
    return NextResponse.json({ isFriend: false, error: `line_api_${res.status}` })
  } catch (e) {
    console.error('[check-friendship] failed', e)
    return NextResponse.json({ isFriend: false, error: 'internal' }, { status: 500 })
  }
}
