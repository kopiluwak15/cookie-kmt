"use client";

import { useMemo, useState } from "react";
import DateRangePicker, {
  DEFAULT_PRESETS,
  type DateRange,
} from "@/components/DateRangePicker";
import { ME, aggregate, generateMyDaily } from "@/lib/staff-mock";

export default function MyStatsPage() {
  const daily = useMemo(() => generateMyDaily(60), []);
  const initial = DEFAULT_PRESETS.find((p) => p.key === "30")!.range();
  const [range, setRange] = useState<DateRange>(initial);
  const [activePreset, setActivePreset] = useState<string | null>("30");
  const { from, to } = range;

  const stats = useMemo(() => aggregate(daily, from, to), [daily, from, to]);
  const conceptRatio =
    stats.customers > 0
      ? Math.round((stats.conceptCount / stats.customers) * 100)
      : 0;
  const judgmentLogRate =
    stats.conceptCount > 0
      ? Math.round((stats.judgmentLogCount / stats.conceptCount) * 100)
      : 0;
  const avgDailySales = stats.days > 0 ? Math.round(stats.sales / stats.days) : 0;

  // 日別グラフ
  const maxSales = Math.max(...stats.points.map((p) => p.sales), 1);

  return (
    <main className="min-h-screen bg-canvas pb-24">
      {/* ヘッダー */}
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
            COOKIE 熊本
          </p>
          <p className="text-sm font-bold text-ink">マイ実績</p>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* 期間ピッカー */}
        <section>
          <div className="flex items-baseline justify-between mb-2 px-1">
            <p className="text-[10px] text-ink-muted">期間</p>
            <p className="text-[10px] text-ink-muted">{stats.days}営業日</p>
          </div>
          <DateRangePicker
            value={range}
            onChange={setRange}
            activePresetKey={activePreset}
            onPresetChange={setActivePreset}
            compact
          />
        </section>

        {/* KPI */}
        <section className="grid grid-cols-2 gap-2.5">
          <KpiBox
            label="売上"
            value={`¥${(stats.sales / 10000).toFixed(0)}万`}
            sub={`日次平均 ¥${(avgDailySales / 1000).toFixed(0)}k`}
            accent
          />
          <KpiBox
            label="お客様"
            value={`${stats.customers}名`}
            sub={`${(stats.customers / Math.max(stats.days, 1)).toFixed(1)}名/日`}
          />
          <KpiBox
            label="コンセプト率"
            value={`${conceptRatio}%`}
            sub={`${stats.conceptCount}件`}
            target={60}
            current={conceptRatio}
          />
          <KpiBox
            label="判断ログ率"
            value={`${judgmentLogRate}%`}
            sub={`${stats.judgmentLogCount}/${stats.conceptCount}件`}
            target={90}
            current={judgmentLogRate}
          />
        </section>

        {/* 日別売上チャート */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-4">
          <h2 className="text-sm font-bold text-ink mb-3">日別売上</h2>
          {stats.points.length === 0 ? (
            <p className="text-xs text-ink-muted text-center py-6">
              データがありません
            </p>
          ) : (
            <div className="flex items-end gap-0.5 h-32">
              {stats.points.map((p) => {
                const h = (p.sales / maxSales) * 100;
                return (
                  <div
                    key={p.date}
                    className="flex-1 bg-brand/20 rounded-t relative group"
                    style={{ height: `${Math.max(h, 2)}%` }}
                    title={`${p.date}: ¥${p.sales.toLocaleString()}`}
                  >
                    <div
                      className="absolute inset-x-0 bottom-0 bg-brand rounded-t"
                      style={{ height: "100%" }}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-baseline justify-between mt-2 text-[10px] text-ink-muted">
            <span>{from.slice(5)}</span>
            <span>{to.slice(5)}</span>
          </div>
        </section>

        {/* インセンティブ目安 */}
        <section className="rounded-2xl border-2 border-brand/30 bg-brand/5 p-4">
          <p className="text-[10px] tracking-wider text-brand-dark font-bold mb-1">
            INCENTIVE
          </p>
          <p className="text-sm font-bold text-ink mb-2">期間内インセンティブ目安</p>
          <p className="text-3xl font-bold text-brand-dark">
            ¥{Math.round(stats.sales * 0.15).toLocaleString()}
          </p>
          <p className="text-[10px] text-ink-muted mt-1">
            ※ 売上の15%・コンセプト判断ログ充足率による加算は確定時に反映
          </p>
        </section>
      </div>
    </main>
  );
}

function KpiBox({
  label,
  value,
  sub,
  accent = false,
  target,
  current,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  target?: number;
  current?: number;
}) {
  const achieved = target !== undefined && current !== undefined && current >= target;
  return (
    <div
      className={`rounded-2xl p-4 border ${
        accent
          ? "bg-brand text-white border-brand"
          : "bg-white border-brand-light/60"
      }`}
    >
      <p
        className={`text-[10px] mb-1 ${
          accent ? "text-white/80" : "text-ink-muted"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-2xl font-bold ${
          accent ? "text-white" : "text-ink"
        } leading-tight`}
      >
        {value}
      </p>
      <p
        className={`text-[10px] mt-1 ${
          accent ? "text-white/80" : "text-ink-muted"
        }`}
      >
        {sub}
      </p>
      {target !== undefined && (
        <p
          className={`text-[10px] mt-1 font-bold ${
            achieved
              ? accent
                ? "text-white"
                : "text-green-600"
              : accent
              ? "text-white/70"
              : "text-amber-700"
          }`}
        >
          目標 {target}% {achieved && "✓"}
        </p>
      )}
    </div>
  );
}
