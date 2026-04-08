import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAGES, type StageCode } from "@/lib/admin-mock";
import StaffNewModal from "./_components/StaffNewModal";

export const dynamic = "force-dynamic";

const STAGE_NAME: Record<string, string> = Object.fromEntries(
  STAGES.map((s) => [s.code, s.name]),
);

type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  stage: StageCode | null;
  joined_at: string | null;
  enabled: boolean;
};

export default async function StaffListPage() {
  const supabase = await createClient();
  const { data: staff, error } = await supabase
    .from("staff")
    .select("id,name,email,role,stage,joined_at,enabled")
    .order("joined_at", { ascending: true, nullsFirst: false });

  const rows: StaffRow[] = (staff as StaffRow[] | null) ?? [];
  const active = rows.filter((s) => s.enabled);

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-7xl mx-auto pl-16 lg:pl-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
              COOKIE 熊本 / ADMIN
            </p>
            <h1 className="text-lg font-bold text-ink">スタッフ管理</h1>
          </div>
          <StaffNewModal />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">
            読み込みエラー: {error.message}
          </p>
        )}

        {/* 統計サマリー */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <SummaryCard label="在籍スタッフ" value={`${active.length}名`} />
          <SummaryCard
            label="管理者"
            value={`${active.filter((s) => s.role === "admin").length}名`}
          />
          <SummaryCard
            label="スタイリスト以上"
            value={`${
              active.filter(
                (s) =>
                  s.stage === "S1" || s.stage === "S2" || s.stage === "SM",
              ).length
            }名`}
          />
          <SummaryCard
            label="無効アカウント"
            value={`${rows.length - active.length}名`}
          />
        </section>

        {/* スタッフ一覧テーブル */}
        <section>
          {rows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-brand-light/60 px-6 py-16 text-center">
              <p className="text-sm text-ink-muted mb-2">
                まだスタッフが登録されていません
              </p>
              <p className="text-[11px] text-ink-muted">
                右上の「＋ 新規登録」から追加してください
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-brand-light/60 overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-canvas text-[10px] font-bold text-ink-muted border-b border-brand-light/40">
                <div className="col-span-4">スタッフ</div>
                <div className="col-span-3">メール</div>
                <div className="col-span-2">ステージ</div>
                <div className="col-span-2">権限</div>
                <div className="col-span-1 text-right">状態</div>
              </div>

              {rows.map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/staff/${s.id}`}
                  className="block border-b border-brand-light/40 last:border-0 active:bg-canvas transition"
                >
                  {/* mobile */}
                  <div className="md:hidden p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center text-base font-bold shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink truncate">
                          {s.name}
                          {!s.enabled && (
                            <span className="ml-2 text-[9px] text-red-600">
                              無効
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-ink-muted truncate">
                          {s.email}
                        </p>
                        <p className="text-[10px] text-brand-dark mt-0.5">
                          {s.stage ? `${s.stage}：${STAGE_NAME[s.stage]}` : "—"}
                          {" / "}
                          {s.role === "admin" ? "管理者" : "スタッフ"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* desktop */}
                  <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 items-center">
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink truncate">
                          {s.name}
                        </p>
                        <p className="text-[10px] text-ink-muted truncate">
                          {s.joined_at
                            ? `${s.joined_at} 入社`
                            : "入社日未設定"}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="text-xs text-ink truncate">{s.email}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-ink">
                        {s.stage
                          ? `${s.stage}：${STAGE_NAME[s.stage]}`
                          : "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          s.role === "admin"
                            ? "bg-brand/10 text-brand-dark border-brand/30"
                            : "bg-canvas text-ink-muted border-brand-light/60"
                        }`}
                      >
                        {s.role === "admin" ? "管理者" : "スタッフ"}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      {s.enabled ? (
                        <span className="text-[10px] text-green-700">●</span>
                      ) : (
                        <span className="text-[10px] text-red-500">●</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-light/60 p-4">
      <p className="text-[10px] text-ink-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-ink">{value}</p>
    </div>
  );
}
