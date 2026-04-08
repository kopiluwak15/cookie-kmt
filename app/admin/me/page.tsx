"use client";

import Link from "next/link";
import { useState } from "react";

const ADMIN_PROFILE = {
  name: "黒田 真菜武",
  email: "admin@cookie.hair",
  role: "代表 / 管理者",
  store: "COOKIE 熊本",
  joinedAt: "2018-04-01",
};

const MENU_GROUPS: {
  title: string;
  items: { icon: string; label: string; href: string; danger?: boolean }[];
}[] = [
  {
    title: "アカウント",
    items: [
      { icon: "👤", label: "プロフィール編集", href: "#profile" },
      { icon: "🔐", label: "パスワード変更", href: "#password" },
      { icon: "📧", label: "メールアドレス変更", href: "#email" },
    ],
  },
  {
    title: "設定",
    items: [
      { icon: "🏪", label: "店舗情報", href: "/admin/settings/store" },
      { icon: "💴", label: "料金マスター", href: "/admin/settings/pricing" },
      { icon: "🔔", label: "通知設定", href: "/admin/settings/notify" },
      { icon: "👥", label: "アカウント管理", href: "/admin/settings/accounts" },
    ],
  },
  {
    title: "その他",
    items: [
      { icon: "❓", label: "ヘルプ", href: "#help" },
      { icon: "📜", label: "利用規約", href: "#terms" },
      { icon: "🚪", label: "ログアウト", href: "/staff/login", danger: true },
    ],
  },
];

export default function AdminMePage() {
  const [lineLinked, setLineLinked] = useState(true);

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-3xl mx-auto pl-16 lg:pl-6">
          <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
            COOKIE 熊本 / ADMIN
          </p>
          <h1 className="text-lg font-bold text-ink">マイページ</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* プロフィールカード */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand text-white flex items-center justify-center text-2xl font-bold shrink-0">
              {ADMIN_PROFILE.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-ink-muted mb-0.5">
                {ADMIN_PROFILE.role}
              </p>
              <p className="text-base font-bold text-ink truncate">
                {ADMIN_PROFILE.name}
              </p>
              <p className="text-[10px] text-ink-muted truncate">
                {ADMIN_PROFILE.email}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-brand-light/40">
            <div>
              <p className="text-[10px] text-ink-muted mb-0.5">店舗</p>
              <p className="text-xs font-bold text-ink">{ADMIN_PROFILE.store}</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-muted mb-0.5">入社日</p>
              <p className="text-xs font-bold text-ink">
                {ADMIN_PROFILE.joinedAt}
              </p>
            </div>
          </div>
        </section>

        {/* LINE連携 */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#06C755] text-white flex items-center justify-center text-lg font-bold shrink-0">
              L
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink">LINE連携</p>
              <p className="text-[11px] text-ink-muted">
                {lineLinked
                  ? "連携済み — LINEでログインできます"
                  : "LINEを連携するとログインが簡単になります"}
              </p>
            </div>
          </div>
          {lineLinked ? (
            <button
              type="button"
              onClick={() => {
                if (confirm("LINE連携を解除しますか？")) setLineLinked(false);
              }}
              className="w-full py-2.5 rounded-xl border border-red-200 text-xs font-bold text-red-600 active:bg-red-50 transition"
            >
              LINE連携を解除
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setLineLinked(true)}
              className="w-full py-3 rounded-xl bg-[#06C755] text-white text-sm font-bold active:opacity-80 transition"
            >
              LINEと連携する
            </button>
          )}
        </section>

        {/* メニュー */}
        {MENU_GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="text-[10px] tracking-wider font-bold text-ink-muted mb-2 px-1">
              {g.title.toUpperCase()}
            </h2>
            <div className="bg-white rounded-2xl border border-brand-light/60 divide-y divide-brand-light/40 overflow-hidden">
              {g.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3.5 active:bg-canvas transition"
                >
                  <span className="text-lg w-6 text-center">{item.icon}</span>
                  <span
                    className={`flex-1 text-sm font-semibold ${
                      item.danger ? "text-red-600" : "text-ink"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="text-ink-muted text-xs">→</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <p className="text-[10px] text-ink-muted/60 text-center pt-2">
          cookie-kmt v0.1.0
        </p>
      </div>
    </main>
  );
}
