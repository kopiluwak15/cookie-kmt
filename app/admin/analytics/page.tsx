"use client";

import { useState } from "react";
import DateRangePicker, {
  DEFAULT_PRESETS,
  type DateRange,
} from "@/components/DateRangePicker";
import {
  CONCERNS_RESOLVED,
  NORTH_STAR,
  STAFF_PERFORMANCE,
} from "@/lib/admin-mock";

// 売上の月次推移（ダミー）
const MONTHLY_SALES = [
  { month: "2025-11", sales: 2180, concept: 1156, visits: 198 },
  { month: "2025-12", sales: 2510, concept: 1380, visits: 224 },
  { month: "2026-01", sales: 2550, concept: 1453, visits: 226 },
  { month: "2026-02", sales: 2760, concept: 1627, visits: 238 },
  { month: "2026-03", sales: 2980, concept: 1788, visits: 252 },
  { month: "2026-04", sales: 960, concept: 606, visits: 82 },
];

const MENU_MIX = [
  { label: "コンセプト矯正", value: 38, color: "bg-brand" },
  { label: "髪質改善ストレート", value: 22, color: "bg-brand-dark" },
  { label: "モイスチャーカラー", value: 14, color: "bg-amber-500" },
  { label: "プレミアムトリートメント", value: 11, color: "bg-green-500" },
  { label: "その他", value: 15, color: "bg-gray-300" },
];

export default function AdminAnalyticsPage() {
  const monthPreset = DEFAULT_PRESETS.find((p) => p.key === "month")!;
  const [range, setRange] = useState<DateRange>(monthPreset.range());
  const [activePreset, setActivePreset] = useState<string | null>("month");

  const maxSales = Math.max(...MONTHLY_SALES.map((m) => m.sales));

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-7xl mx-auto pl-16 lg:pl-6">
          <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
            COOKIE 熊本 / ADMIN
          </p>
          <h1 className="text-lg font-bold text-ink">売上・分析</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* 期間ピッカー */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[11px] text-ink-muted">期間</p>
            <p className="text-[11px] text-ink-muted">
              {range.from} 〜 {range.to}
            </p>
          </div>
          <DateRangePicker
            value={range}
            onChange={setRange}
            activePresetKey={activePreset}
            onPresetChange={setActivePreset}
          />
        </section>

        {/* サマリー */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="総売上" value="¥298万" delta="+8%" />
          <KpiCard label="コンセプト売上" value="¥179万" delta="+12%" tone="brand" />
          <KpiCard label="総来店数" value="252名" delta="+6%" />
          <KpiCard
            label="客単価"
            value="¥11,825"
            delta="+2%"
          />
        </section>

        {/* 月次売上推移 */}
        <section>
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-base font-bold text-ink">売上推移（月次）</h2>
            <p className="text-[11px] text-ink-muted flex-1">直近6ヶ月</p>
          </div>
          <div className="bg-white rounded-2xl border border-brand-light/60 p-5">
            <div className="space-y-3">
              {MONTHLY_SALES.map((m) => {
                const pct = (m.sales / maxSales) * 100;
                const conceptPct = (m.concept / m.sales) * 100;
                return (
                  <div key={m.month}>
                    <div className="flex items-baseline justify-between mb-1">
                      <p className="text-xs font-bold text-ink">{m.month}</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-bold text-ink">
                          ¥{m.sales}千
                        </p>
                        <p className="text-[10px] text-brand-dark">
                          コンセプト {Math.round(conceptPct)}%
                        </p>
                      </div>
                    </div>
                    <div className="h-3 bg-canvas rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-brand-light/70 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                      <div
                        className="absolute left-0 top-0 h-full bg-brand rounded-full"
                        style={{ width: `${pct * (conceptPct / 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-brand-light/40">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-brand" />
                <span className="text-[10px] text-ink-muted">コンセプト売上</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-brand-light/70" />
                <span className="text-[10px] text-ink-muted">その他売上</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2カラム */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* メニュー構成比 */}
          <section>
            <h2 className="text-base font-bold text-ink mb-3">
              メニュー別売上構成比
            </h2>
            <div className="bg-white rounded-2xl border border-brand-light/60 p-5">
              <div className="flex h-4 rounded-full overflow-hidden mb-4">
                {MENU_MIX.map((m) => (
                  <div
                    key={m.label}
                    className={m.color}
                    style={{ width: `${m.value}%` }}
                    title={`${m.label} ${m.value}%`}
                  />
                ))}
              </div>
              <div className="space-y-2">
                {MENU_MIX.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${m.color}`} />
                      <p className="text-xs text-ink">{m.label}</p>
                    </div>
                    <p className="text-xs font-bold text-ink">{m.value}%</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 悩みカテゴリ別 */}
          <section>
            <h2 className="text-base font-bold text-ink mb-3">
              解決した悩み（カテゴリ別）
            </h2>
            <div className="bg-white rounded-2xl border border-brand-light/60 p-5 space-y-3">
              {CONCERNS_RESOLVED.map((c) => {
                const max = Math.max(...CONCERNS_RESOLVED.map((x) => x.count));
                const pct = (c.count / max) * 100;
                return (
                  <div key={c.category}>
                    <div className="flex items-baseline justify-between mb-1">
                      <p className="text-xs font-bold text-ink">{c.category}</p>
                      <p className="text-[11px] text-ink-muted">
                        <span className="text-sm font-bold text-brand-dark">
                          {c.count}
                        </span>
                        件 / 成功率 {c.successRate}%
                      </p>
                    </div>
                    <div className="h-2 bg-canvas rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* North Star 達成率 */}
        <section>
          <h2 className="text-base font-bold text-ink mb-3">
            North Star KPI 達成状況
          </h2>
          <div className="bg-white rounded-2xl border border-brand-light/60 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiBar
              label="コンセプト売上構成比"
              value={NORTH_STAR.conceptRatio}
              target={NORTH_STAR.conceptRatioTarget}
              unit="%"
            />
            <KpiBar
              label="再来店率"
              value={NORTH_STAR.returnRate}
              target={NORTH_STAR.returnRateTarget}
              unit="%"
            />
            <KpiBar
              label="判断ログ充足率"
              value={NORTH_STAR.judgmentLogRate}
              target={NORTH_STAR.judgmentLogRateTarget}
              unit="%"
            />
            <KpiBar
              label="コンセプト顧客LTV"
              value={Math.round(NORTH_STAR.conceptLtv / 1000)}
              target={Math.round(NORTH_STAR.conceptLtvTarget / 1000)}
              unit="千円"
            />
          </div>
        </section>

        {/* スタッフランキング */}
        <section>
          <h2 className="text-base font-bold text-ink mb-3">
            スタッフ別売上ランキング
          </h2>
          <div className="bg-white rounded-2xl border border-brand-light/60 overflow-hidden">
            {[...STAFF_PERFORMANCE]
              .sort((a, b) => b.sales - a.sales)
              .map((s, i) => (
                <div
                  key={s.staffId}
                  className="flex items-center gap-3 px-4 py-3 border-b border-brand-light/40 last:border-0"
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0
                        ? "bg-amber-100 text-amber-700"
                        : i === 1
                        ? "bg-gray-100 text-gray-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <p className="flex-1 text-sm font-bold text-ink truncate">
                    {s.name}
                  </p>
                  <p className="text-sm font-bold text-ink shrink-0">
                    ¥{(s.sales / 10000).toFixed(0)}万
                  </p>
                  <p className="text-[10px] text-brand-dark shrink-0 w-14 text-right">
                    +¥{(s.incentive / 1000).toFixed(0)}k
                  </p>
                </div>
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  delta,
  tone = "default",
}: {
  label: string;
  value: string;
  delta: string;
  tone?: "default" | "brand";
}) {
  return (
    <div className="bg-white rounded-2xl border border-brand-light/60 p-4">
      <p className="text-[10px] text-ink-muted mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p
          className={`text-xl font-bold ${
            tone === "brand" ? "text-brand-dark" : "text-ink"
          }`}
        >
          {value}
        </p>
        <span className="text-[10px] font-bold text-green-600">{delta}</span>
      </div>
    </div>
  );
}

function KpiBar({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  const pct = Math.min(100, (value / target) * 100);
  const achieved = value >= target;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-xs font-bold text-ink">{label}</p>
        <p className="text-[11px] text-ink-muted">
          <span className="text-sm font-bold text-ink">{value}</span>
          {unit} / 目標 {target}
          {unit}
        </p>
      </div>
      <div className="h-2 bg-canvas rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${achieved ? "bg-green-500" : "bg-brand"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
