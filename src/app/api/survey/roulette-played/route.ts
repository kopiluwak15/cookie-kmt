import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { line_user_id } = await request.json()

    if (!line_user_id) {
      return NextResponse.json(
        { error: 'line_user_id is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('customer')
      .update({ last_roulette_at: new Date().toISOString() })
      .eq('line_user_id', line_user_id)

    if (error) {
      console.error('ルーレット記録エラー:', error)
      return NextResponse.json(
        { error: 'Failed to record roulette play' },
        { status: 500 }
      )
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('ルーレット記録APIエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
