"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ADMIN_CUSTOMERS,
  CONCERN_CATEGORIES,
  STATUS_COLOR,
  STATUS_LABEL,
  type AdminCustomer,
  type CustomerStatus,
} from "@/lib/customers-mock";

const STATUS_FILTERS: { key: "all" | CustomerStatus; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "new", label: "新規" },
  { key: "active", label: "稼働中" },
  { key: "at_risk", label: "離脱懸念" },
  { key: "dormant", label: "休眠" },
];

export default function AdminCustomersPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CustomerStatus>("all");
  const [concern, setConcern] = useState<string>("すべて");
  const [conceptOnly, setConceptOnly] = useState(false);

  const filtered = useMemo(() => {
    return ADMIN_CUSTOMERS.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (concern !== "すべて" && c.concern !== concern) return false;
      if (conceptOnly && !c.isConcept) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.kana.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [query, status, concern, conceptOnly]);

  const stats = useMemo(() => {
    return {
      total: ADMIN_CUSTOMERS.length,
      active: ADMIN_CUSTOMERS.filter((c) => c.status === "active").length,
      atRisk: ADMIN_CUSTOMERS.filter((c) => c.status === "at_risk").length,
      concept: ADMIN_CUSTOMERS.filter((c) => c.isConcept).length,
    };
  }, []);

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-7xl mx-auto pl-16 lg:pl-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
              COOKIE 熊本 / ADMIN
            </p>
            <h1 className="text-lg font-bold text-ink">顧客管理</h1>
          </div>
          <button
            type="button"
            className="shrink-0 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-bold active:bg-brand-dark transition"
          >
            ＋ 新規登録
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* 統計 */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="総顧客数" value={`${stats.total}名`} />
          <SummaryCard label="稼働中" value={`${stats.active}名`} />
          <SummaryCard label="離脱懸念" value={`${stats.atRisk}名`} tone="warn" />
          <SummaryCard label="コンセプト顧客" value={`${stats.concept}名`} tone="brand" />
        </section>

        {/* 検索 */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-4 space-y-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="名前・フリガナ・顧客IDで検索"
            className="w-full bg-canvas border border-brand-light/60 rounded-xl px-4 py-3 text-sm text-ink outline-none focus:border-brand-dark"
          />

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatus(f.key)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                  status === f.key
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink border-brand-light/60 active:bg-canvas"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {CONCERN_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setConcern(c)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                  concern === c
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-ink-muted border-brand-light/60 active:bg-canvas"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              checked={conceptOnly}
              onChange={(e) => setConceptOnly(e.target.checked)}
              className="w-4 h-4 accent-brand"
            />
            <span className="text-xs font-bold text-ink">
              コンセプト顧客のみ表示
            </span>
          </label>
        </section>

        {/* リスト */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[11px] text-ink-muted">{filtered.length}件 / {ADMIN_CUSTOMERS.length}件</p>
          </div>

          <div className="bg-white rounded-2xl border border-brand-light/60 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-canvas text-[10px] font-bold text-ink-muted border-b border-brand-light/40">
              <div className="col-span-3">顧客</div>
              <div className="col-span-2">主な悩み</div>
              <div className="col-span-2">担当</div>
              <div className="col-span-2 text-right">来店</div>
              <div className="col-span-2 text-right">累計</div>
              <div className="col-span-1 text-right">状態</div>
            </div>

            {filtered.map((c) => (
              <CustomerRow key={c.id} c={c} />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-ink-muted py-10">
                該当する顧客がいません
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function CustomerRow({ c }: { c: AdminCustomer }) {
  return (
    <Link
      href={`/admin/customers/${c.id}`}
      className="block border-b border-brand-light/40 last:border-0 active:bg-canvas transition"
    >
      {/* Mobile */}
      <div className="md:hidden p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold shrink-0">
            {c.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-bold text-ink truncate">{c.name}</p>
              {c.isConcept && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand/10 text-brand-dark shrink-0">
                  コンセプト
                </span>
              )}
            </div>
            <p className="text-[10px] text-ink-muted truncate">
              {c.id} / {c.kana}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[c.status]}`}
              >
                {STATUS_LABEL[c.status]}
              </span>
              <p className="text-[10px] text-ink-muted truncate">{c.concern}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-ink">
              ¥{(c.totalSpend / 10000).toFixed(1)}万
            </p>
            <p className="text-[10px] text-ink-muted">{c.visitCount}回</p>
          </div>
        </div>
      </div>

      {/* PC */}
      <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 items-center">
        <div className="col-span-3 flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold shrink-0">
            {c.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-ink truncate">{c.name}</p>
              {c.isConcept && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-brand/10 text-brand-dark shrink-0">
                  C
                </span>
              )}
            </div>
            <p className="text-[10px] text-ink-muted truncate">{c.id}</p>
          </div>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-ink truncate">{c.concern}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-ink-muted truncate">{c.mainStaff}</p>
        </div>
        <div className="col-span-2 text-right">
          <p className="text-sm font-bold text-ink">{c.visitCount}回</p>
          <p className="text-[10px] text-ink-muted">{c.lastVisit}</p>
        </div>
        <div className="col-span-2 text-right">
          <p className="text-sm font-bold text-ink">
            ¥{(c.totalSpend / 10000).toFixed(1)}万
          </p>
        </div>
        <div className="col-span-1 text-right">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[c.status]}`}
          >
            {STATUS_LABEL[c.status]}
          </span>
        </div>
      </div>
    </Link>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "brand";
}) {
  const valueColor =
    tone === "warn"
      ? "text-amber-600"
      : tone === "brand"
      ? "text-brand-dark"
      : "text-ink";
  return (
    <div className="bg-white rounded-2xl border border-brand-light/60 p-4">
      <p className="text-[10px] text-ink-muted mb-1">{label}</p>
      <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
