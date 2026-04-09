import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, name_kana, phone, birth_month, visit_motivation, notes } = body

    if (!name) {
      return NextResponse.json(
        { error: 'お名前は必須です' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const birthday = birth_month
      ? `2000-${String(birth_month).padStart(2, '0')}-01`
      : null

    // 日本時間の今日
    const now = new Date()
    const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const today = jstDate.toISOString().split('T')[0]

    const { data: customer, error } = await supabase
      .from('customer')
      .insert({
        name,
        name_kana: name_kana || null,
        phone: phone || null,
        birthday,
        visit_motivation: visit_motivation || null,
        notes: notes || null,
        line_user_id: null,
        line_blocked: false,
        first_visit_date: today,
        last_visit_date: today,
        total_visits: 0,
      })
      .select('customer_code, name')
      .single()

    if (error) {
      console.error('未連携顧客作成エラー:', error)
      return NextResponse.json(
        { error: 'データの保存に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      customer_code: customer.customer_code,
      name: customer.name,
    })
  } catch (error) {
    console.error('未連携登録API エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
