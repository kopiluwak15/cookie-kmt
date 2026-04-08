"use client";

import { useMemo, useState } from "react";
import { CATEGORY_LABEL, MENUS, type Menu, type MenuCategory } from "@/lib/menus";

const CATEGORIES: { key: "all" | MenuCategory; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "cut", label: "カット" },
  { key: "color", label: "カラー" },
  { key: "perm", label: "パーマ" },
  { key: "straight", label: "矯正" },
  { key: "treatment", label: "TR" },
  { key: "spa", label: "スパ" },
  { key: "set", label: "セット" },
  { key: "option", label: "オプション" },
];

export default function AdminMenusPage() {
  const [category, setCategory] = useState<"all" | MenuCategory>("all");
  const [query, setQuery] = useState("");
  const [conceptOnly, setConceptOnly] = useState(false);

  const filtered = useMemo(() => {
    return MENUS.filter((m) => {
      if (category !== "all" && m.category !== category) return false;
      if (conceptOnly && !m.concept) return false;
      if (query && !m.name.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [category, query, conceptOnly]);

  const totalConcept = MENUS.filter((m) => m.concept).length;

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-7xl mx-auto pl-16 lg:pl-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
              COOKIE 熊本 / ADMIN
            </p>
            <h1 className="text-lg font-bold text-ink">メニュー管理</h1>
          </div>
          <button
            type="button"
            className="shrink-0 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-bold active:bg-brand-dark transition"
          >
            ＋ 新規追加
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* 統計 */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="総メニュー数" value={`${MENUS.length}件`} />
          <SummaryCard
            label="コンセプトメニュー"
            value={`${totalConcept}件`}
            tone="brand"
          />
          <SummaryCard
            label="平均価格"
            value={`¥${Math.round(
              MENUS.reduce((s, m) => s + m.price, 0) / MENUS.length,
            ).toLocaleString()}`}
          />
          <SummaryCard
            label="最高価格"
            value={`¥${Math.max(...MENUS.map((m) => m.price)).toLocaleString()}`}
          />
        </section>

        {/* フィルター */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-4 space-y-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="メニュー名で検索"
            className="w-full bg-canvas border border-brand-light/60 rounded-xl px-4 py-3 text-sm text-ink outline-none focus:border-brand-dark"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                  category === c.key
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink border-brand-light/60 active:bg-canvas"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={conceptOnly}
              onChange={(e) => setConceptOnly(e.target.checked)}
              className="w-4 h-4 accent-brand"
            />
            <span className="text-xs font-bold text-ink">
              コンセプトメニューのみ表示
            </span>
          </label>
        </section>

        {/* リスト */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[11px] text-ink-muted">
              {filtered.length}件 / {MENUS.length}件
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-brand-light/60 overflow-hidden divide-y divide-brand-light/40">
            {filtered.map((m) => (
              <MenuRow key={m.id} m={m} />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-ink-muted py-10">
                該当するメニューがありません
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function MenuRow({ m }: { m: Menu }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-bold text-ink truncate">{m.name}</p>
          {m.concept && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand/10 text-brand-dark shrink-0">
              コンセプト
            </span>
          )}
        </div>
        <p className="text-[10px] text-ink-muted">
          {CATEGORY_LABEL[m.category]} / ID: {m.id}
        </p>
      </div>
      <p className="text-sm font-bold text-ink shrink-0">
        ¥{m.price.toLocaleString()}
      </p>
      <button
        type="button"
        className="shrink-0 px-3 py-1.5 rounded-lg border border-brand-light/60 text-[11px] font-bold text-ink active:bg-canvas transition"
      >
        編集
      </button>
    </div>
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
