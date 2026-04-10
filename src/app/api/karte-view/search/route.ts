import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** 顧客検索（スタッフ認証済み前提） */
export async function POST(req: NextRequest) {
  const { lineUserId, query } = (await req.json()) as { lineUserId?: string; query?: string }

  if (!lineUserId) {
    return NextResponse.json({ error: 'LINE認証情報が必要です' }, { status: 401 })
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

  if (!query || query.trim().length < 1) {
    return NextResponse.json({ customers: [] })
  }

  const q = query.trim()

  const { data: customers } = await supabase
    .from('customer')
    .select('id, customer_code, name, name_kana, phone, last_visit_date, total_visits')
    .or(`name.ilike.%${q}%,name_kana.ilike.%${q}%,customer_code.ilike.%${q}%,phone.ilike.%${q}%`)
    .order('updated_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ customers: customers || [] })
}
