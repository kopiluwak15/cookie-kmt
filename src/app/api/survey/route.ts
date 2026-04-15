import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      line_user_id,
      name,
      name_kana,
      phone,
      birth_month,
      visit_motivation,
      notes,
    } = body

    // バリデーション
    if (!line_user_id || !name || !visit_motivation) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 誕生月 → date形式に変換（月のみ保存）
    const birthday = birth_month
      ? `2000-${String(birth_month).padStart(2, '0')}-01`
      : null

    // 日本時間の今日の日付
    const now = new Date()
    const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const today = jstDate.toISOString().split('T')[0]

    // LINE user IDで既存顧客を検索
    const { data: existing } = await supabase
      .from('customer')
      .select('id')
      .eq('line_user_id', line_user_id)
      .single()

    if (existing) {
      // 既存顧客を更新（万が一webhookで先に作られた場合）
      const { error } = await supabase
        .from('customer')
        .update({
          name,
          name_kana: name_kana || null,
          phone: phone || null,
          birthday,
          visit_motivation,
          notes: notes || null,
          first_visit_date: today,
          last_visit_date: today,
        })
        .eq('id', existing.id)

      if (error) {
        console.error('顧客更新エラー:', error)
        return NextResponse.json(
          { error: 'データの保存に失敗しました' },
          { status: 500 }
        )
      }
    } else {
      // 新規顧客として作成
      // line_friend_date は webhook の follow イベントで設定する。
      // LIFF 認証だけで line_user_id は取れるが、実際に友だち追加されている
      // とは限らないため、ここで設定しない。
      const { error } = await supabase.from('customer').insert({
        name,
        name_kana: name_kana || null,
        phone: phone || null,
        birthday,
        visit_motivation,
        notes: notes || null,
        line_user_id,
        first_visit_date: today,
        last_visit_date: today,
      })

      if (error) {
        console.error('顧客作成エラー:', error)
        return NextResponse.json(
          { error: 'データの保存に失敗しました' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('アンケートAPI エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
