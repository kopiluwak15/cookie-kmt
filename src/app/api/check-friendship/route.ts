// LINE user ID を受け取り、公式LINEの友だち追加状態と「ブロック中」かを
// サーバーサイドで判定する。
//
// - LIFF の Aggressive モードは「未追加」ユーザーに友達追加UIを出すが、
//   「ブロック中」のユーザーはスキップしてしまう（LINE仕様）。
// - そこで、DB の customer.line_blocked （webhookの unfollow で true）
//   をもとにブロック状態を検知し、アプリ側でゲート表示する。
//
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

    const admin = createAdminClient()

    // 1a. 未登録ユーザー含め全員対応する blocked_line_users を先に確認
    const { data: blockedRow } = await admin
      .from('blocked_line_users')
      .select('line_user_id')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    const friendAddUrl = await resolveFriendAddUrl(token)

    if (blockedRow) {
      return NextResponse.json({
        isFriend: false,
        isBlocked: true,
        friendAddUrl,
      })
    }

    // 1b. DB 上の customer.line_blocked も念のため確認（冗長な保険）
    const { data: existing } = await admin
      .from('customer')
      .select('id, line_friend_date, line_blocked')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    if (existing?.line_blocked) {
      return NextResponse.json({
        isFriend: false,
        isBlocked: true,
        friendAddUrl,
      })
    }

    // 2. LINE Profile API: 友だち未追加なら 404
    const res = await fetch(
      `https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (res.status === 404) {
      // 未追加（新規）→ Aggressive が処理するはずなのでゲートは原則不要。
      // 念のためフラグだけ返し、クライアント側で保険UIを出すか判断可能にする。
      return NextResponse.json({
        isFriend: false,
        isBlocked: false,
        friendAddUrl,
      })
    }

    if (res.ok) {
      // 友だち判定成功 → 既存顧客なら line_friend_date を更新
      if (existing) {
        const updates: Record<string, unknown> = {}
        if (!existing.line_friend_date) {
          updates.line_friend_date = new Date().toISOString()
        }
        if (existing.line_blocked) {
          // 万一ここに来ることがあれば解除扱い
          updates.line_blocked = false
        }
        if (Object.keys(updates).length > 0) {
          await admin.from('customer').update(updates).eq('id', existing.id)
        }
      }
      return NextResponse.json({ isFriend: true, isBlocked: false })
    }

    // その他 (500等): 判定不能 → UX 優先で通す（ブロックでも 200 返る想定だが念のため）
    const errBody = await res.text().catch(() => '')
    console.error('[check-friendship] unexpected status', res.status, errBody)
    return NextResponse.json({
      isFriend: false,
      isBlocked: false,
      friendAddUrl,
      error: `line_api_${res.status}`,
    })
  } catch (e) {
    console.error('[check-friendship] failed', e)
    return NextResponse.json(
      { isFriend: false, isBlocked: false, error: 'internal' },
      { status: 500 }
    )
  }
}

// 友達追加URLを解決する。
// 1. 環境変数があればそれを使用
// 2. なければ LINE Bot Info API で basicId を取得して URL を組み立てる
let cachedFriendAddUrl: { url: string; expires: number } | null = null
async function resolveFriendAddUrl(token: string): Promise<string | null> {
  const envUrl = process.env.NEXT_PUBLIC_LINE_FRIEND_URL || process.env.LINE_FRIEND_URL
  if (envUrl) return envUrl

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
    const encoded = encodeURIComponent(info.basicId)
    const url = `https://line.me/R/ti/p/${encoded}`
    cachedFriendAddUrl = { url, expires: Date.now() + 60 * 60 * 1000 }
    return url
  } catch (e) {
    console.error('[check-friendship] bot info failed', e)
    return null
  }
}
