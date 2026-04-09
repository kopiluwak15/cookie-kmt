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

// 1) store
let { data: store } = await sb.from("store").select("*").eq("store_code","kmt").maybeSingle();
if (!store) {
  const r = await sb.from("store").insert({
    name: "縮毛矯正&髪質改善 COOKIE 熊本",
    store_code: "kmt",
    address: "熊本市",
    is_active: true,
  }).select().single();
  if (r.error) { console.error(r.error); process.exit(1); }
  store = r.data;
  console.log("✓ store created:", store.id);
} else {
  console.log("• store exists:", store.id);
}

// 2) auth user
const EMAIL = "admin@cookie.hair";
const PASSWORD = "123456";
let userId = null;
const list = await sb.auth.admin.listUsers();
const existing = list.data?.users?.find(u => u.email === EMAIL);
if (existing) {
  userId = existing.id;
  console.log("• auth user exists:", userId);
  // reset password to 123456
  await sb.auth.admin.updateUserById(userId, { password: PASSWORD });
  console.log("• password reset to 123456");
} else {
  const r = await sb.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: "黒田 真菜武" },
  });
  if (r.error) { console.error(r.error); process.exit(1); }
  userId = r.data.user.id;
  console.log("✓ auth user created:", userId);
}

// 3) staff row
const { data: staffExisting } = await sb.from("staff").select("*").eq("email", EMAIL).maybeSingle();
if (staffExisting) {
  await sb.from("staff").update({
    auth_user_id: userId,
    name: "黒田 真菜武",
    role: "admin",
    is_active: true,
    store_id: store.id,
    must_change_password: true,
    employment_type: "full_time",
    stage: "S6",
  }).eq("id", staffExisting.id);
  console.log("✓ staff updated:", staffExisting.id);
} else {
  const r = await sb.from("staff").insert({
    auth_user_id: userId,
    email: EMAIL,
    name: "黒田 真菜武",
    role: "admin",
    is_active: true,
    store_id: store.id,
    must_change_password: true,
    employment_type: "full_time",
    stage: "S6",
  }).select().single();
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log("✓ staff created:", r.data.id);
}

console.log("\n✅ bootstrap complete");
console.log("login:", EMAIL, "/", PASSWORD);
