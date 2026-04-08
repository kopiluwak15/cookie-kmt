import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGES, type StageCode } from "@/lib/admin-mock";

export const dynamic = "force-dynamic";

const STAGE_NAME: Record<string, string> = Object.fromEntries(
  STAGES.map((s) => [s.code, s.name]),
);

type StaffRow = {
  id: string;
  name: string;
  name_kana: string | null;
  email: string;
  role: "admin" | "staff";
  stage: StageCode | null;
  joined_at: string | null;
  enabled: boolean;
  password_initialized: boolean;
  line_user_id: string | null;
  created_at: string;
};

export default async function StaffDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("staff")
    .select(
      "id,name,name_kana,email,role,stage,joined_at,enabled,password_initialized,line_user_id,created_at",
    )
    .eq("id", params.id)
    .maybeSingle<StaffRow>();

  if (!staff) notFound();

  const yearsServed = staff.joined_at
    ? Math.floor(
        (new Date("2026-04-08").getTime() -
          new Date(staff.joined_at).getTime()) /
          (1000 * 60 * 60 * 24 * 365),
      )
    : null;

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-7xl mx-auto flex items-center gap-4 pl-16 lg:pl-6">
          <Link href="/admin/staff" className="text-brand-dark text-sm font-bold">
            ← 一覧
          </Link>
          <div className="h-6 w-px bg-brand-light/60" />
          <p className="text-[10px] tracking-[0.3em] text-brand-dark">
            STAFF DETAIL
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* プロフィール */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-brand text-white flex items-center justify-center text-3xl font-bold shrink-0">
              {staff.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-ink">{staff.name}</h1>
                {!staff.enabled && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-bold">
                    無効
                  </span>
                )}
              </div>
              {staff.name_kana && (
                <p className="text-[11px] text-ink-muted mb-0.5">
                  {staff.name_kana}
                </p>
              )}
              <p className="text-[11px] text-ink-muted">
                {staff.stage
                  ? `${staff.stage}：${STAGE_NAME[staff.stage]}`
                  : "ステージ未設定"}
                {" / "}
                {staff.role === "admin" ? "管理者" : "スタッフ"}
              </p>
              {staff.joined_at && (
                <p className="text-[11px] text-ink-muted mt-1">
                  入社 {staff.joined_at}
                  {yearsServed !== null && ` / 在籍 ${yearsServed}年`}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* アカウント情報 */}
        <section>
          <h2 className="text-sm font-bold text-ink mb-3">アカウント情報</h2>
          <div className="bg-white rounded-2xl border border-brand-light/60 divide-y divide-brand-light/40">
            <Row label="メールアドレス" value={staff.email} />
            <Row
              label="初回パスワード変更"
              value={
                staff.password_initialized ? (
                  <span className="text-green-700">✓ 変更済み</span>
                ) : (
                  <span className="text-amber-700">未変更（初期パスワード）</span>
                )
              }
            />
            <Row
              label="LINE連携"
              value={
                staff.line_user_id ? (
                  <span className="text-green-700">✓ 連携済み</span>
                ) : (
                  <span className="text-ink-muted">未連携</span>
                )
              }
            />
            <Row
              label="登録日"
              value={staff.created_at.slice(0, 10)}
            />
          </div>
        </section>

        {/* 編集アクション（今後実装） */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ActionCard icon="✏️" label="編集" disabled />
          <ActionCard icon="🔐" label="パスワード再発行" disabled />
          <ActionCard icon="💰" label="報酬詳細" disabled />
          <ActionCard
            icon={staff.enabled ? "🚫" : "✅"}
            label={staff.enabled ? "無効化" : "有効化"}
            disabled
          />
        </section>

        <p className="text-[10px] text-ink-muted text-center pt-4">
          売上・判断ログ・再来店率は visits / judgment_logs 接続後に表示されます
        </p>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <p className="text-xs text-ink-muted w-32 shrink-0">{label}</p>
      <p className="text-sm text-ink flex-1 min-w-0 break-all">{value}</p>
    </div>
  );
}

function ActionCard({
  icon,
  label,
  disabled,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-brand-light/60 px-4 py-4 text-center ${
        disabled ? "opacity-40" : "active:bg-canvas transition"
      }`}
    >
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-xs font-bold text-ink">{label}</p>
      {disabled && (
        <p className="text-[9px] text-ink-muted mt-0.5">準備中</p>
      )}
    </div>
  );
}
