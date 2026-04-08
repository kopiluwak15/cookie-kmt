"use client";

import { useState } from "react";
import { PERMISSIONS, STAFF_PERFORMANCE, type Permission } from "@/lib/admin-mock";

type AccountRow = {
  staffId: string;
  name: string;
  email: string;
  permission: Permission;
  enabled: boolean;
  lastLogin?: string;
  lineLinked: boolean;
};

const INITIAL_ACCOUNTS: AccountRow[] = STAFF_PERFORMANCE.map((s, i) => ({
  staffId: s.staffId,
  name: s.name,
  email: `${s.staffId}@cookie.hair`,
  permission: (i === 0 ? "admin" : "staff") as Permission,
  enabled: true,
  lastLogin: i === 0 ? "2026-04-08 09:12" : i === 1 ? "2026-04-08 10:00" : "2026-04-07 18:32",
  lineLinked: i !== 2,
}));

export default function AccountsSettingsPage() {
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);

  const togglePermission = (id: string) => {
    setAccounts((a) =>
      a.map((x) =>
        x.staffId === id
          ? { ...x, permission: x.permission === "admin" ? "staff" : "admin" }
          : x,
      ),
    );
  };

  const toggleEnabled = (id: string) => {
    setAccounts((a) =>
      a.map((x) => (x.staffId === id ? { ...x, enabled: !x.enabled } : x)),
    );
  };

  const resetPassword = (id: string, name: string) => {
    if (confirm(`${name} のパスワードを初期値（123456）にリセットしますか？`)) {
      alert("パスワードをリセットしました（モック）");
    }
  };

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-5xl mx-auto pl-16 lg:pl-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
              COOKIE 熊本 / ADMIN / 設定
            </p>
            <h1 className="text-lg font-bold text-ink">アカウント管理</h1>
          </div>
          <button
            type="button"
            className="shrink-0 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-bold active:bg-brand-dark transition"
          >
            ＋ アカウント追加
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* 統計 */}
        <section className="grid grid-cols-3 gap-3">
          <SummaryCard
            label="総アカウント"
            value={`${accounts.length}`}
          />
          <SummaryCard
            label="管理者"
            value={`${accounts.filter((a) => a.permission === "admin").length}`}
            tone="brand"
          />
          <SummaryCard
            label="有効"
            value={`${accounts.filter((a) => a.enabled).length}`}
          />
        </section>

        {/* アカウント一覧 */}
        <section>
          <div className="bg-white rounded-2xl border border-brand-light/60 overflow-hidden divide-y divide-brand-light/40">
            {accounts.map((a) => (
              <div key={a.staffId} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {a.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-ink truncate">
                        {a.name}
                      </p>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          a.permission === "admin"
                            ? "bg-brand/10 text-brand-dark"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {PERMISSIONS.find((p) => p.id === a.permission)?.label}
                      </span>
                      {!a.enabled && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 shrink-0">
                          無効
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-muted truncate">
                      {a.email}
                    </p>
                    <p className="text-[10px] text-ink-muted mt-0.5">
                      最終ログイン: {a.lastLogin ?? "—"}
                      {a.lineLinked && " / LINE連携済"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-brand-light/40 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => togglePermission(a.staffId)}
                    className="px-3 py-1.5 rounded-lg border border-brand-light/60 text-[11px] font-bold text-ink active:bg-canvas transition"
                  >
                    権限切替
                  </button>
                  <button
                    type="button"
                    onClick={() => resetPassword(a.staffId, a.name)}
                    className="px-3 py-1.5 rounded-lg border border-brand-light/60 text-[11px] font-bold text-ink active:bg-canvas transition"
                  >
                    パスワードリセット
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleEnabled(a.staffId)}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition ${
                      a.enabled
                        ? "border-red-200 text-red-600 active:bg-red-50"
                        : "border-green-200 text-green-600 active:bg-green-50"
                    }`}
                  >
                    {a.enabled ? "アカウント無効化" : "アカウント有効化"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 権限の説明 */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-5">
          <h2 className="text-sm font-bold text-ink mb-3">権限について</h2>
          <dl className="space-y-2 text-xs text-ink-muted">
            <div>
              <dt className="font-bold text-ink inline">管理者: </dt>
              <dd className="inline">
                すべての管理画面にアクセス可能。スタッフの追加・削除、料金設定、店舗情報の変更ができます。
              </dd>
            </div>
            <div>
              <dt className="font-bold text-ink inline">スタッフ: </dt>
              <dd className="inline">
                スタッフアプリのみ使用可能。自身の担当顧客と判断ログの閲覧・記録ができます。
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "brand";
}) {
  return (
    <div className="bg-white rounded-2xl border border-brand-light/60 p-4">
      <p className="text-[10px] text-ink-muted mb-1">{label}</p>
      <p
        className={`text-xl font-bold ${
          tone === "brand" ? "text-brand-dark" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
