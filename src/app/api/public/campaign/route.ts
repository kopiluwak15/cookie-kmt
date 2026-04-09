import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// キャッシュ無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 日本時間の現在月を取得
  const now = new Date()
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const currentMonth = jstNow.getMonth() + 1

  const defaultCampaign = {
    month: currentMonth,
    title: `${currentMonth}月キャンペーン`,
    description: '',
    link: 'https://beauty.hotpepper.jp/slnH000654498/coupon/',
  }

  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
  }

  const { data } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'monthly_campaigns')
    .single()

  if (!data) {
    return NextResponse.json(defaultCampaign, { headers })
  }

  try {
    const campaigns = JSON.parse(data.value)
    const campaign = campaigns[String(currentMonth)] || {
      title: `${currentMonth}月キャンペーン`,
      description: '',
      link: 'https://beauty.hotpepper.jp/slnH000654498/coupon/',
    }
    return NextResponse.json({ month: currentMonth, ...campaign }, { headers })
  } catch {
    return NextResponse.json(defaultCampaign, { headers })
  }
}
