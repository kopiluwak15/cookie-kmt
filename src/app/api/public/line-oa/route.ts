// 公式LINE（Official Account）情報の公開エンドポイント
// LIFF welcome 画面から呼び出され、友だち追加URLを返す
// global_settings.line_oa_basic_id に保存されている値を参照する
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'line_oa_basic_id')
      .maybeSingle()

    const basicId = (data?.value || '').trim()
    if (!basicId) {
      return NextResponse.json({ addFriendUrl: null, basicId: null })
    }

    // "@abc123" 形式を正規化（@ がなくても付ける）
    const normalized = basicId.startsWith('@') ? basicId : `@${basicId}`
    // Android版LINEは @ を %40 にエンコードしたURLをディープリンクとして認識しないため、
    // encodeURIComponent は使わずそのまま @ を残す
    const addFriendUrl = `https://line.me/R/ti/p/${normalized}`

    return NextResponse.json({ addFriendUrl, basicId: normalized })
  } catch (e) {
    console.error('line-oa fetch failed', e)
    return NextResponse.json({ addFriendUrl: null, basicId: null })
  }
}
