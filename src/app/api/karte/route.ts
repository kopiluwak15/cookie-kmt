// 初回カルテ作成 API
// /liff/register からPOSTされる
// - customer に新規作成 (LINE userId 紐付け)
// - karte_intake に質問票を保存
// - 選択メニューに is_concept があれば isConcept = true を返す
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { performStoreGpsCheck } from '@/lib/geo-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  lineUserId?: string | null
  name: string
  furigana: string
  birthday: string
  phone: string
  address?: string
  occupation?: string
  gender: 'female' | 'male' | 'other'
  visitRoute: string
  todaysWish: string[]
  history: string[]
  worries: string[]
  worriesOther?: string
  reasons: string[]
  reasonsOther?: string
  stayStyle: string
  stayStyleOther?: string
  dislikes: string[]
  dislikesOther?: string
  spots: string[]
  selectedMenus: string[] // service_menus.id (uuid)
  /** ジオフェンス検証用 (LIFF側で取得) */
  lat?: number | null
  lng?: number | null
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!body.name || !body.furigana || !body.birthday || !body.phone || !body.gender) {
    return NextResponse.json(
      { ok: false, error: 'missing_required_fields' },
      { status: 400 }
    )
  }

  // ジオフェンス検証（店舗から離れすぎていれば 403）
  const gpsCheck = await performStoreGpsCheck(body)
  if (!gpsCheck.ok) return gpsCheck.response

  const supabase = createAdminClient()
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // コンセプトメニュー判定
  // カルテ作成時はカテゴリーキーのみ送られる（具体メニューはスタッフが施術ログで入力）
  // 'kaizen' (髪質改善 / 縮毛矯正) が含まれていればコンセプト扱い
  const isConcept = !!body.selectedMenus?.includes('kaizen')

  // 既存判定 (LINE userId 紐付き)
  let customerId: string | null = null
  if (body.lineUserId) {
    const { data: existing } = await supabase
      .from('customer')
      .select('id')
      .eq('line_user_id', body.lineUserId)
      .maybeSingle()
    if (existing) customerId = existing.id
  }

  const customerPayload = {
    name: body.name,
    name_kana: body.furigana,
    phone: body.phone || null,
    birthday: body.birthday || null,
    gender: body.gender,
    address: body.address || null,
    occupation: body.occupation || null,
    visit_motivation: body.visitRoute,
    line_user_id: body.lineUserId || null,
    // line_friend_date は webhook の follow イベントで設定する。
    // LIFF 認証だけで line_user_id は取れるが、実際に友だち追加されている
    // とは限らないため、ここで NOW を入れると LINE 配信で「ブロック扱い」
    // のエラーが起きる原因になる。
    first_visit_date: today,
    last_visit_date: today,
  }

  if (customerId) {
    const { error } = await supabase
      .from('customer')
      .update(customerPayload)
      .eq('id', customerId)
    if (error) {
      console.error('customer update failed', error)
      return NextResponse.json(
        { ok: false, error: 'customer_update_failed', detail: error.message },
        { status: 500 }
      )
    }
  } else {
    const { data: created, error } = await supabase
      .from('customer')
      .insert(customerPayload)
      .select('id')
      .single()
    if (error || !created) {
      console.error('customer insert failed', error)
      return NextResponse.json(
        { ok: false, error: 'customer_insert_failed', detail: error?.message },
        { status: 500 }
      )
    }
    customerId = created.id
  }

  // karte_intake INSERT
  const { error: intakeErr } = await supabase.from('karte_intake').insert({
    customer_id: customerId,
    visit_route: body.visitRoute,
    todays_wish: body.todaysWish,
    history: body.history,
    worries: body.worries,
    worries_other: body.worriesOther || null,
    reasons: body.reasons,
    reasons_other: body.reasonsOther || null,
    stay_style: body.stayStyle,
    stay_style_other: body.stayStyleOther || null,
    dislikes: body.dislikes,
    dislikes_other: body.dislikesOther || null,
    spots: body.spots,
    // selected_menus カラムは text[] 型（00030 で uuid[] → text[] に変更済み）
    selected_menus: body.selectedMenus || [],
    is_concept_session: isConcept,
    raw: body,
  })

  if (intakeErr) {
    console.error('karte_intake insert failed', intakeErr)
    return NextResponse.json(
      { ok: false, error: 'karte_insert_failed', detail: intakeErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    customer: { id: customerId, isConcept },
  })
}
