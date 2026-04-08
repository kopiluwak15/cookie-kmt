// 初回カルテ作成 API
// /liff/register からPOSTされる
// - 顧客を customers に新規作成
// - 質問票を karte_intakes に保存
// - customer_code は連番で自動採番
//
// 認証: 現在は匿名OK（QR読み取り直後の新規顧客）
// 将来: LIFF authToken 検証を追加して line_user_id を記録する
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  name: string;
  furigana: string;
  birthday: string;
  phone: string;
  address?: string;
  occupation?: string;
  gender: "female" | "male" | "other";
  visitRoute: string;
  todaysWish: string[];
  history: string[];
  worries: string[];
  worriesOther?: string;
  reasons: string[];
  reasonsOther?: string;
  stayStyle: string;
  stayStyleOther?: string;
  dislikes: string[];
  dislikesOther?: string;
  spots: string[];
  selectedMenus: number[];
  // 将来用
  lineUserId?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // 必須チェック
  if (!body.name || !body.furigana || !body.birthday || !body.phone || !body.gender) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  const supa = createAdminClient();

  // 1. 店舗（COOKIE 熊本）取得
  const { data: store, error: storeErr } = await supa
    .from("stores")
    .select("id")
    .eq("code", "kmt")
    .single();

  if (storeErr || !store) {
    console.error("store fetch failed", storeErr);
    return NextResponse.json({ error: "store_not_found" }, { status: 500 });
  }

  // 2. customer_code 採番（C-000XXX）
  const { count } = await supa
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("store_id", store.id);

  const nextNum = (count ?? 0) + 1;
  const customerCode = `C-${String(nextNum).padStart(6, "0")}`;

  // 3. コンセプトメニューが含まれているか判定
  let isConcept = false;
  let mainConcern: string | null = null;
  if (body.selectedMenus?.length) {
    const { data: menus } = await supa
      .from("menus")
      .select("id, is_concept")
      .in("id", body.selectedMenus);
    isConcept = !!menus?.some((m) => m.is_concept);
  }
  if (body.worries?.length) {
    mainConcern = body.worries[0];
  }

  // 4. customers INSERT
  const { data: customer, error: custErr } = await supa
    .from("customers")
    .insert({
      store_id: store.id,
      customer_code: customerCode,
      name: body.name,
      name_kana: body.furigana,
      birthday: body.birthday,
      gender: body.gender,
      phone: body.phone,
      address: body.address || null,
      occupation: body.occupation || null,
      line_user_id: body.lineUserId || null,
      first_visit_at: new Date().toISOString().slice(0, 10),
      status: "new",
      is_concept: isConcept,
      main_concern: mainConcern,
    })
    .select("id, customer_code")
    .single();

  if (custErr || !customer) {
    console.error("customer insert failed", custErr);
    return NextResponse.json(
      { error: "customer_insert_failed", detail: custErr?.message },
      { status: 500 },
    );
  }

  // 5. karte_intakes INSERT
  const { error: karteErr } = await supa.from("karte_intakes").insert({
    store_id: store.id,
    customer_id: customer.id,
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
    selected_menus: body.selectedMenus,
    is_concept_session: isConcept,
    raw: body,
  });

  if (karteErr) {
    console.error("karte insert failed", karteErr);
    // customers は残す（顧客レコードは成立しているため）
    return NextResponse.json(
      { error: "karte_insert_failed", detail: karteErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    customer: {
      id: customer.id,
      code: customer.customer_code,
      isConcept,
    },
  });
}
