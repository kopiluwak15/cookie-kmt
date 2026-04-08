"use client";

import { useState } from "react";

type IncentiveRule = {
  id: string;
  label: string;
  threshold: number;
  rate: number; // %
  bonus?: number;
};

const DEFAULT_RULES: IncentiveRule[] = [
  {
    id: "base",
    label: "基本インセンティブ（売上比率）",
    threshold: 600000,
    rate: 15,
  },
  {
    id: "mid",
    label: "中位達成（80万円以上）",
    threshold: 800000,
    rate: 18,
  },
  {
    id: "top",
    label: "上位達成（100万円以上）",
    threshold: 1000000,
    rate: 20,
    bonus: 20000,
  },
  {
    id: "concept",
    label: "コンセプト比率ボーナス（60%以上）",
    threshold: 60,
    rate: 5,
  },
  {
    id: "judgment",
    label: "判断ログ率ボーナス（90%以上）",
    threshold: 90,
    rate: 3,
  },
];

const TAX_OPTIONS = [
  { value: "10", label: "10% (標準)" },
  { value: "8", label: "8% (軽減)" },
  { value: "0", label: "非課税" },
];

export default function PricingSettingsPage() {
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [tax, setTax] = useState("10");
  const [priceDisplay, setPriceDisplay] = useState<"inc" | "exc">("inc");
  const [saved, setSaved] = useState(false);

  const updateRule = (id: string, field: keyof IncentiveRule, value: number) => {
    setRules((rs) =>
      rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-3xl mx-auto pl-16 lg:pl-6">
          <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
            COOKIE 熊本 / ADMIN / 設定
          </p>
          <h1 className="text-lg font-bold text-ink">料金マスター</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* 税率設定 */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-6">
          <h2 className="text-sm font-bold text-ink mb-4">税率・表示設定</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-2">
                消費税率
              </label>
              <select
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className="w-full bg-canvas border border-brand-light/60 rounded-xl px-4 py-3 text-sm text-ink outline-none focus:border-brand-dark"
              >
                {TAX_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-2">
                価格表示
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPriceDisplay("inc")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                    priceDisplay === "inc"
                      ? "bg-ink text-white border-ink"
                      : "bg-white text-ink border-brand-light/60"
                  }`}
                >
                  税込価格
                </button>
                <button
                  type="button"
                  onClick={() => setPriceDisplay("exc")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                    priceDisplay === "exc"
                      ? "bg-ink text-white border-ink"
                      : "bg-white text-ink border-brand-light/60"
                  }`}
                >
                  税抜価格
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* インセンティブ設定 */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-bold text-ink">インセンティブルール</h2>
            <p className="text-[11px] text-ink-muted">スタッフの報酬計算式</p>
          </div>

          <div className="space-y-4">
            {rules.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-brand-light/60 bg-canvas"
              >
                <p className="text-xs font-bold text-ink mb-3">{r.label}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1">
                      閾値
                    </label>
                    <input
                      type="number"
                      value={r.threshold}
                      onChange={(e) =>
                        updateRule(r.id, "threshold", Number(e.target.value))
                      }
                      className="w-full bg-white border border-brand-light/60 rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-brand-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1">
                      率（%）
                    </label>
                    <input
                      type="number"
                      value={r.rate}
                      onChange={(e) =>
                        updateRule(r.id, "rate", Number(e.target.value))
                      }
                      className="w-full bg-white border border-brand-light/60 rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-brand-dark"
                    />
                  </div>
                </div>
                {r.bonus !== undefined && (
                  <div className="mt-3">
                    <label className="block text-[10px] text-ink-muted mb-1">
                      固定ボーナス（円）
                    </label>
                    <input
                      type="number"
                      value={r.bonus}
                      onChange={(e) =>
                        updateRule(r.id, "bonus", Number(e.target.value))
                      }
                      className="w-full bg-white border border-brand-light/60 rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-brand-dark"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 保存 */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <p className="text-xs font-bold text-green-600">✓ 保存しました</p>
          )}
          <button
            type="button"
            onClick={save}
            className="px-5 py-2.5 rounded-xl bg-ink text-white text-sm font-bold active:bg-ink-muted transition"
          >
            すべて保存
          </button>
        </div>
      </div>
    </main>
  );
}
