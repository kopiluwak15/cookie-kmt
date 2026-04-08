"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/staff",       icon: "📋", label: "施術ログ" },
  { href: "/staff/stats", icon: "📈", label: "マイ実績" },
  { href: "/staff/store", icon: "🏪", label: "店舗実績" },
  { href: "/staff/me",    icon: "👤", label: "マイページ" },
];

export default function StaffBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/staff") return pathname === "/staff";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-brand-light/60 z-30">
      <div className="grid grid-cols-4 max-w-md mx-auto">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2.5 gap-0.5 transition ${
                active ? "text-brand-dark" : "text-ink-muted"
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-white" />
    </nav>
  );
}
