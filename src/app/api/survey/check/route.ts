import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { performStoreGpsCheck } from '@/lib/geo-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { line_user_id, lat, lng } = body as {
      line_user_id?: string
      lat?: number | null
      lng?: number | null
    }

    if (!line_user_id) {
      return NextResponse.json(
        { error: 'line_user_id is required' },
        { status: 400 }
      )
    }

    // ジオフェンス検証（店舗から離れすぎていれば 403）
    const gpsCheck = await performStoreGpsCheck({ lat, lng })
    if (!gpsCheck.ok) return gpsCheck.response

    const supabase = createAdminClient()

    const { data: customer } = await supabase
      .from('customer')
      .select('id, name, visit_motivation, total_visits, line_blocked, first_visit_date')
      .eq('line_user_id', line_user_id)
      .single()

    if (!customer) {
      return NextResponse.json({ exists: false, hasSurvey: false })
    }

    // 日本時間の今日の日付
    const now = new Date()
    const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const today = jstDate.toISOString().split('T')[0]

    // チェックイン: visit dateを今日に更新 + ブロック解除
    const updateData: Record<string, unknown> = {
      last_visit_date: today,
      updated_at: new Date().toISOString(),
    }
    // 初回来店日が未設定なら設定
    if (!customer.first_visit_date) {
      updateData.first_visit_date = today
    }
    if (customer.line_blocked) {
      updateData.line_blocked = false
      console.log('[Check-in] ブロック解除:', customer.name, line_user_id)
    }
    await supabase
      .from('customer')
      .update(updateData)
      .eq('id', customer.id)

    // アンケート済みかどうか: visit_motivationが設定されている
    const hasSurvey = !!customer.visit_motivation

    return NextResponse.json({
      exists: true,
      hasSurvey,
      name: customer.name,
      totalVisits: customer.total_visits,
    })
  } catch (error) {
    console.error('顧客チェックAPIエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
