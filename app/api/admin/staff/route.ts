import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "staff";
  stage?: string | null;
  joined_at?: string | null;
};

export async function POST(request: Request) {
  // 認可: ログイン済み + admin ロール
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data: me } = await supabase
    .from("staff")
    .select("role, store_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const role = body.role === "admin" ? "admin" : "staff";
  const stage = body.stage || null;
  const joined_at = body.joined_at || null;

  if (!name || !email || !password || password.length < 6) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1) auth.users 作成（email_confirm=true で即ログイン可能）
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (authErr || !created.user) {
    return NextResponse.json(
      { error: "auth_create_failed", detail: authErr?.message },
      { status: 400 },
    );
  }

  // 2) staff 行 insert
  const { data: staffRow, error: insErr } = await admin
    .from("staff")
    .insert({
      store_id: me.store_id,
      auth_user_id: created.user.id,
      email,
      name,
      role,
      stage,
      joined_at,
      password_initialized: false,
    })
    .select("id")
    .single();

  if (insErr) {
    // ロールバック: auth user を削除
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: "staff_insert_failed", detail: insErr.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, id: staffRow.id });
}
