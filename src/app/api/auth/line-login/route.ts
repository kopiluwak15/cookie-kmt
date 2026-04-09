import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: 'アクセストークンが必要です' }, { status: 400 })
    }

    // 1. LINE アクセストークンを検証
    const verifyRes = await fetch(
      `https://api.line.me/oauth2/v2.1/verify?access_token=${accessToken}`
    )
    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'LINEトークンが無効です' }, { status: 401 })
    }

    // 2. LINE プロフィール取得
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!profileRes.ok) {
      return NextResponse.json({ error: 'LINEプロフィールの取得に失敗しました' }, { status: 401 })
    }
    const profile = await profileRes.json()
    const lineUserId = profile.userId

    // 3. スタッフを検索
    const supabase = createAdminClient()
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('auth_user_id, email, name')
      .eq('line_user_id', lineUserId)
      .eq('is_active', true)
      .single()

    if (staffError || !staff) {
      return NextResponse.json(
        { error: 'LINE連携されたスタッフが見つかりません。先にスタッフ画面からLINE連携を行ってください。' },
        { status: 404 }
      )
    }

    // 4. マジックリンクを生成してセッション発行
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: staff.email,
    })

    if (linkError || !linkData) {
      return NextResponse.json({ error: 'ログインリンクの生成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      hashed_token: linkData.properties.hashed_token,
      email: staff.email,
      name: staff.name,
    })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
