import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: 'アクセストークンが必要です' }, { status: 400 })
    }

    // 1. 現在ログイン中のスタッフを取得
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 2. LINE アクセストークンを検証
    const verifyRes = await fetch(
      `https://api.line.me/oauth2/v2.1/verify?access_token=${accessToken}`
    )
    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'LINEトークンが無効です' }, { status: 401 })
    }

    // 3. LINE プロフィール取得
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!profileRes.ok) {
      return NextResponse.json({ error: 'LINEプロフィールの取得に失敗しました' }, { status: 401 })
    }
    const profile = await profileRes.json()

    // 4. 既に他のスタッフが使用していないかチェック
    const { data: existing } = await supabase
      .from('staff')
      .select('id')
      .eq('line_user_id', profile.userId)
      .neq('auth_user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'このLINEアカウントは既に他のスタッフに紐付けられています' },
        { status: 409 }
      )
    }

    // 5. スタッフのline_user_idを更新
    const { error: updateError } = await supabase
      .from('staff')
      .update({ line_user_id: profile.userId })
      .eq('auth_user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
