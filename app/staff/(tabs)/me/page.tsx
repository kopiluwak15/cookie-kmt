"use client";

import Link from "next/link";
import { useState } from "react";
import { ME } from "@/lib/staff-mock";

const MENU_GROUPS: {
  title: string;
  items: { icon: string; label: string; href: string; danger?: boolean }[];
}[] = [
  {
    title: "アカウント",
    items: [
      { icon: "👤", label: "プロフィール編集",   href: "/staff/me/profile" },
      { icon: "🔐", label: "パスワード変更",     href: "/staff/me/password" },
      { icon: "📧", label: "メール・電話変更",   href: "/staff/me/contact" },
    ],
  },
  {
    title: "通知",
    items: [
      { icon: "🔔", label: "通知設定",           href: "/staff/me/notify" },
      { icon: "💬", label: "コメント受信履歴",   href: "/staff/me/messages" },
    ],
  },
  {
    title: "業務",
    items: [
      { icon: "📅", label: "シフト確認",         href: "/staff/me/schedule" },
      { icon: "💰", label: "報酬詳細",           href: "/staff/me/incentive" },
      { icon: "📋", label: "判断ログ全件",       href: "/staff/me/judgments" },
    ],
  },
  {
    title: "サポート",
    items: [
      { icon: "❓", label: "ヘルプ",             href: "/staff/me/help" },
      { icon: "📜", label: "利用規約",           href: "/staff/me/terms" },
      { icon: "🚪", label: "ログアウト",         href: "/logout", danger: true },
    ],
  },
];

export default function MyPage() {
  const yearsServed = Math.floor(
    (new Date("2026-04-08").getTime() - new Date(ME.joinedAt).getTime()) /
      (1000 * 60 * 60 * 24 * 365),
  );
  const [lineLinked, setLineLinked] = useState(false);
  const [linking, setLinking] = useState(false);

  const linkLine = async () => {
    setLinking(true);
    // TODO: LIFF / LINE Login で連携
    // window.location.href = "/api/auth/line/link"
    await new Promise((r) => setTimeout(r, 600));
    setLinking(false);
    setLineLinked(true);
  };

  const unlinkLine = () => {
    if (!confirm("LINE連携を解除しますか？")) return;
    setLineLinked(false);
  };

  return (
    <main className="min-h-screen bg-canvas pb-24">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
            COOKIE 熊本
          </p>
          <p className="text-sm font-bold text-ink">マイページ</p>
        </div>
      </header>

      <div className="px-4 py-5 space-y-5">
        {/* プロフィールカード */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand text-white flex items-center justify-center text-2xl font-bold shrink-0">
              {ME.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-ink-muted mb-0.5">{ME.role}</p>
              <p className="text-base font-bold text-ink truncate">{ME.name}</p>
              <p className="text-[10px] text-ink-muted">
                在籍 {yearsServed}年 / {ME.joinedAt}入社
              </p>
            </div>
          </div>
          <Link
            href="/staff/me/profile"
            className="block mt-4 text-center py-2.5 rounded-xl border border-brand-light/60 text-xs font-bold text-ink active:bg-canvas transition"
          >
            プロフィールを編集
          </Link>
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
                  : "LINEアカウントを連携するとLINEログインが使えます"}
              </p>
            </div>
          </div>
          {lineLinked ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200">
                <span className="text-green-600 text-sm">✓</span>
                <p className="text-xs font-bold text-green-700">
                  連携済み（LINE ID: U1234...abcd）
                </p>
              </div>
              <button
                type="button"
                onClick={unlinkLine}
                className="w-full py-2.5 rounded-xl border border-red-200 text-xs font-bold text-red-600 active:bg-red-50 transition"
              >
                LINE連携を解除
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={linkLine}
              disabled={linking}
              className="w-full py-3 rounded-xl bg-[#06C755] text-white text-sm font-bold active:opacity-80 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <span className="text-base">L</span>
              {linking ? "連携中..." : "LINEと連携する"}
            </button>
          )}
        </section>

        {/* メニューグループ */}
        {MENU_GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="text-[10px] tracking-wider font-bold text-ink-muted mb-2 px-1">
              {g.title.toUpperCase()}
            </h2>
            <div className="bg-white rounded-2xl border border-brand-light/60 divide-y divide-brand-light/40 overflow-hidden">
              {g.items.map((item) => (
                <Link
                  key={item.href}
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

        {/* バージョン */}
        <p className="text-[10px] text-ink-muted/60 text-center pt-2">
          cookie-kmt v0.1.0
        </p>
      </div>
    </main>
  );
}
