import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL.includes("tnswycbrudtstcpamlup")) {
  console.error("⛔ Wrong project:", URL);
  process.exit(1);
}
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

// store を取得
const { data: store } = await sb
  .from("store")
  .select("*")
  .eq("store_code", "kmt")
  .maybeSingle();
if (!store) {
  console.error("store not found");
  process.exit(1);
}

const EMAIL = "kuroda@ikkou-e.com";
const PASSWORD = "mk550428";
const NAME = "黒田 学";

// 1) auth user（存在すればパスワードリセット、無ければ作成）
let userId = null;
const list = await sb.auth.admin.listUsers();
const existing = list.data?.users?.find((u) => u.email === EMAIL);
if (existing) {
  userId = existing.id;
  await sb.auth.admin.updateUserById(userId, {
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: NAME },
  });
  console.log("• auth user updated:", userId);
} else {
  const r = await sb.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: NAME },
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  userId = r.data.user.id;
  console.log("✓ auth user created:", userId);
}

// 2) staff row
const { data: staffExisting } = await sb
  .from("staff")
  .select("*")
  .eq("email", EMAIL)
  .maybeSingle();

const payload = {
  auth_user_id: userId,
  email: EMAIL,
  name: NAME,
  role: "admin",
  is_active: true,
  is_owner: true,
  store_id: store.id,
  must_change_password: false, // オーナー本人希望のパスワードなので強制変更なし
  employment_type: "full_time",
  stage: "S6",
};

if (staffExisting) {
  const { error } = await sb
    .from("staff")
    .update(payload)
    .eq("id", staffExisting.id);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log("✓ staff updated (is_owner=true):", staffExisting.id);
} else {
  const { data, error } = await sb
    .from("staff")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log("✓ staff created (is_owner=true):", data.id);
}

// 3) admin@cookie.hair を 非オーナー管理者として残す
await sb.from("staff").update({ is_owner: false }).eq("email", "admin@cookie.hair");

console.log("\n✅ owner bootstrap complete");
console.log("Owner login:", EMAIL, "/", PASSWORD);
console.log("Backup admin:", "admin@cookie.hair / 123456 (not owner)");
