// =====================================================================
// 初期管理者スタッフをブートストラップする
// 使い方:
//   node scripts/bootstrap-admin.mjs
//
// 動作:
//   1. auth.users に admin@cookie.hair (password: 123456) を作成
//   2. staff テーブルに対応する admin ロールのレコードを作成
//   3. すでに存在する場合はスキップ
//
// 安全:
//   - service_role を使うので RLS をバイパスする
//   - 初回パスワードは 123456（ログイン後に強制変更）
// =====================================================================
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

console.log(`Target: ${SUPABASE_URL}`);
if (!SUPABASE_URL.includes("tnswycbrudtstcpamlup")) {
  console.error("⛔ Wrong project! Expected tnswycbrudtstcpamlup");
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN = {
  email: "admin@cookie.hair",
  password: "123456",
  name: "黒田 真菜武",
  name_kana: "クロダ マナブ",
  role: "admin",
  stage: "S2",
};

// 1. 店舗取得
const { data: store, error: storeErr } = await supa
  .from("stores")
  .select("id, name")
  .eq("code", "kmt")
  .single();

if (storeErr || !store) {
  console.error("Store not found:", storeErr);
  process.exit(1);
}
console.log(`Store: ${store.name} (${store.id})`);

// 2. すでに存在するか確認
const { data: existing } = await supa
  .from("staff")
  .select("id, email, name")
  .eq("email", ADMIN.email)
  .maybeSingle();

if (existing) {
  console.log(`Already exists: ${existing.name} (${existing.email})`);
  process.exit(0);
}

// 3. auth.users に作成
const { data: authData, error: authErr } =
  await supa.auth.admin.createUser({
    email: ADMIN.email,
    password: ADMIN.password,
    email_confirm: true,
    user_metadata: { name: ADMIN.name },
  });

if (authErr || !authData?.user) {
  console.error("Auth user creation failed:", authErr);
  process.exit(1);
}
console.log(`Auth user: ${authData.user.id}`);

// 4. staff レコード作成
const { error: staffErr } = await supa.from("staff").insert({
  store_id: store.id,
  auth_user_id: authData.user.id,
  email: ADMIN.email,
  name: ADMIN.name,
  name_kana: ADMIN.name_kana,
  role: ADMIN.role,
  stage: ADMIN.stage,
  joined_at: "2018-04-01",
  enabled: true,
  password_initialized: false,
});

if (staffErr) {
  console.error("Staff insert failed:", staffErr);
  process.exit(1);
}

console.log("");
console.log("✅ Bootstrap complete!");
console.log(`   Email:    ${ADMIN.email}`);
console.log(`   Password: ${ADMIN.password} (must be changed on first login)`);
console.log(`   Role:     ${ADMIN.role}`);
