"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

const MAIN_ITEMS: NavItem[] = [
  { href: "/admin",           icon: "🏠", label: "ダッシュボード" },
  { href: "/admin/customers", icon: "👤", label: "顧客管理" },
  { href: "/admin/staff",     icon: "👥", label: "スタッフ管理" },
  { href: "/admin/menus",     icon: "📋", label: "メニュー管理" },
  { href: "/admin/tickets",   icon: "🎫", label: "チケット" },
  { href: "/admin/analytics", icon: "📊", label: "売上・分析" },
];

const SETTINGS_ITEMS: NavItem[] = [
  { href: "/admin/settings/store",     icon: "🏪", label: "店舗情報" },
  { href: "/admin/settings/pricing",   icon: "💴", label: "料金マスター" },
  { href: "/admin/settings/notify",    icon: "🔔", label: "通知設定" },
  { href: "/admin/settings/accounts",  icon: "🔐", label: "アカウント" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(
    pathname.startsWith("/admin/settings"),
  );

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
          active
            ? "bg-brand text-white"
            : "text-ink hover:bg-canvas"
        }`}
      >
        <span className="text-base">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* モバイル: ハンバーガー */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="メニューを開く"
        className="lg:hidden fixed top-4 left-4 z-30 w-10 h-10 rounded-full bg-white border border-brand-light/60 flex items-center justify-center shadow-sm"
      >
        <span className="text-lg">☰</span>
      </button>

      {/* モバイル: オーバーレイ */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
        />
      )}

      {/* サイドバー本体 */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-brand-light/40 flex flex-col transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* ロゴ */}
        <div className="px-5 py-5 border-b border-brand-light/40">
          <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
            COOKIE 熊本
          </p>
          <p className="text-base font-bold text-ink">Admin Console</p>
        </div>

        {/* メインナビ */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {MAIN_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {/* 区切り */}
          <div className="h-px bg-brand-light/40 my-4 mx-2" />

          {/* 設定アコーディオン */}
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-ink hover:bg-canvas transition"
          >
            <span className="text-base">⚙️</span>
            <span className="flex-1 text-left">設定</span>
            <span
              className={`text-xs text-ink-muted transition-transform ${
                settingsOpen ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>
          {settingsOpen && (
            <div className="ml-3 pl-3 border-l border-brand-light/40 space-y-1 mt-1">
              {SETTINGS_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      active
                        ? "bg-brand/10 text-brand-dark"
                        : "text-ink-muted hover:bg-canvas hover:text-ink"
                    }`}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* 下部: ユーザー情報 */}
        <div className="px-3 py-3 border-t border-brand-light/40">
          <Link
            href="/admin/me"
            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas transition"
          >
            <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold shrink-0">
              黒
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-ink truncate">
                黒田 真菜武
              </p>
              <p className="text-[10px] text-ink-muted">管理者</p>
            </div>
            <span className="text-xs text-ink-muted">→</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
