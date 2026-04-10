import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getKarteViewData } from '@/actions/karte-view'

/** 顧客カルテ詳細取得（スタッフ認証済み前提） */
export async function POST(req: NextRequest) {
  const { lineUserId, customerId } = (await req.json()) as {
    lineUserId?: string
    customerId?: string
  }

  if (!lineUserId) {
    return NextResponse.json({ error: 'LINE認証情報が必要です' }, { status: 401 })
  }
  if (!customerId) {
    return NextResponse.json({ error: '顧客IDが必要です' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // スタッフ確認
  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('line_user_id', lineUserId)
    .eq('is_active', true)
    .single()

  if (!staff) {
    return NextResponse.json({ error: 'スタッフ認証に失敗しました' }, { status: 403 })
  }

  const karteData = await getKarteViewData(customerId)
  if (!karteData) {
    return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404 })
  }

  return NextResponse.json(karteData)
}
