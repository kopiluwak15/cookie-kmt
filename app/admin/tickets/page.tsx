"use client";

import { useState } from "react";
import {
  MOCK_TICKETS,
  TICKET_TEMPLATES,
  daysUntilExpiry,
  formatDiscountLabel,
  type TicketStatus,
} from "@/lib/tickets-mock";

const STATUS_LABEL: Record<TicketStatus, string> = {
  unused: "未使用",
  held: "仮押さえ",
  used: "使用済",
  expired: "期限切れ",
};

const STATUS_STYLE: Record<TicketStatus, string> = {
  unused: "bg-blue-50 text-blue-700 border-blue-200",
  held: "bg-amber-50 text-amber-700 border-amber-200",
  used: "bg-gray-50 text-gray-600 border-gray-200",
  expired: "bg-red-50 text-red-600 border-red-200",
};

export default function AdminTicketsPage() {
  const [tab, setTab] = useState<"templates" | "issued">("templates");

  const stats = {
    total: MOCK_TICKETS.length,
    unused: MOCK_TICKETS.filter((t) => t.status === "unused").length,
    used: MOCK_TICKETS.filter((t) => t.status === "used").length,
    expired: MOCK_TICKETS.filter((t) => t.status === "expired").length,
  };

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-7xl mx-auto pl-16 lg:pl-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
              COOKIE 熊本 / ADMIN
            </p>
            <h1 className="text-lg font-bold text-ink">チケット管理</h1>
          </div>
          <button
            type="button"
            className="shrink-0 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-bold active:bg-brand-dark transition"
          >
            ＋ テンプレート追加
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* 統計 */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="発行総数" value={`${stats.total}枚`} />
          <SummaryCard label="未使用" value={`${stats.unused}枚`} tone="brand" />
          <SummaryCard label="使用済" value={`${stats.used}枚`} />
          <SummaryCard label="期限切れ" value={`${stats.expired}枚`} tone="warn" />
        </section>

        {/* タブ */}
        <div className="flex gap-2 border-b border-brand-light/60">
          <TabBtn active={tab === "templates"} onClick={() => setTab("templates")}>
            テンプレート ({TICKET_TEMPLATES.length})
          </TabBtn>
          <TabBtn active={tab === "issued"} onClick={() => setTab("issued")}>
            発行履歴 ({MOCK_TICKETS.length})
          </TabBtn>
        </div>

        {tab === "templates" && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TICKET_TEMPLATES.map((t) => (
              <div
                key={t.type}
                className="bg-white rounded-2xl border border-brand-light/60 p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-bold text-ink">{t.title}</p>
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand-dark">
                    {t.discountRate
                      ? `${t.discountRate}% OFF`
                      : `¥${t.discountAmount?.toLocaleString()} OFF`}
                  </span>
                </div>
                <p className="text-xs text-ink-muted mb-3 leading-relaxed">
                  {t.description}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-brand-light/40">
                  <p className="text-[10px] text-ink-muted">
                    有効期限: {t.validMonths}ヶ月
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg border border-brand-light/60 text-[11px] font-bold text-ink active:bg-canvas transition"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-ink text-white text-[11px] font-bold active:bg-ink-muted transition"
                    >
                      発行
                    </button>
                  </div>
                </div>
                {t.defaultIssueAfter.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[9px] text-ink-muted mb-1">発行推奨メニュー</p>
                    <div className="flex flex-wrap gap-1">
                      {t.defaultIssueAfter.map((m) => (
                        <span
                          key={m}
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-canvas border border-brand-light/40 text-ink-muted"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {tab === "issued" && (
          <section>
            <div className="bg-white rounded-2xl border border-brand-light/60 overflow-hidden divide-y divide-brand-light/40">
              {MOCK_TICKETS.map((t) => {
                const days = daysUntilExpiry(t.expiresAt);
                return (
                  <div key={t.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-ink truncate">
                          {t.title}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLE[t.status]}`}
                        >
                          {STATUS_LABEL[t.status]}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-muted">
                        顧客: {t.customerId} / 発行: {t.issuedBy} /{" "}
                        {t.issuedAt.slice(0, 10)}
                      </p>
                      <p className="text-[10px] text-ink-muted mt-0.5">
                        有効期限: {t.expiresAt.slice(0, 10)}
                        {t.status === "unused" && days > 0 && (
                          <span className="text-brand-dark font-bold"> (残り{days}日)</span>
                        )}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-brand-dark shrink-0">
                      {formatDiscountLabel(t)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
        active
          ? "text-ink border-brand"
          : "text-ink-muted border-transparent hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "brand" | "warn";
}) {
  const color =
    tone === "brand"
      ? "text-brand-dark"
      : tone === "warn"
      ? "text-amber-600"
      : "text-ink";
  return (
    <div className="bg-white rounded-2xl border border-brand-light/60 p-4">
      <p className="text-[10px] text-ink-muted mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
