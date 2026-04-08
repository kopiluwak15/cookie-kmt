"use client";

import { useState } from "react";
import DateRangePicker, {
  DEFAULT_PRESETS,
  type DateRange,
} from "@/components/DateRangePicker";
import { STORE_KPI, STORE_STAFF, ME } from "@/lib/staff-mock";

export default function StoreStatsPage() {
  const monthPreset = DEFAULT_PRESETS.find((p) => p.key === "month")!;
  const [range, setRange] = useState<DateRange>(monthPreset.range());
  const [activePreset, setActivePreset] = useState<string | null>("month");
  const k = STORE_KPI;

  // ランキング
  const ranked = [...STORE_STAFF].sort((a, b) => b.sales - a.sales);
  const myRank = ranked.findIndex((s) => s.id === ME.id) + 1;

  return (
    <main className="min-h-screen bg-canvas pb-24">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
            COOKIE 熊本
          </p>
          <p className="text-sm font-bold text-ink">店舗実績</p>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* 期間ピッカー */}
        <section>
          <div className="flex items-baseline justify-between mb-2 px-1">
            <p className="text-[10px] text-ink-muted">期間</p>
            <p className="text-[10px] text-ink-muted">
              {range.from} 〜 {range.to}
            </p>
          </div>
          <DateRangePicker
            value={range}
            onChange={setRange}
            activePresetKey={activePreset}
            onPresetChange={setActivePreset}
            compact
          />
        </section>

        {/* 店舗KPI */}
        <section>
          <h2 className="text-sm font-bold text-ink mb-2 px-1">店舗全体</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <KpiCard
              label="売上"
              value={`¥${(k.sales / 10000).toFixed(0)}万`}
              target={k.salesTarget}
              current={k.sales}
              format="money"
              accent
            />
            <KpiCard
              label="お客様数"
              value={`${k.customers}名`}
              target={k.customersTarget}
              current={k.customers}
            />
            <KpiCard
              label="新規"
              value={`${k.newCustomers}名`}
              target={k.newCustomersTarget}
              current={k.newCustomers}
            />
            <KpiCard
              label="コンセプト率"
              value={`${k.conceptRatio}%`}
              target={k.conceptRatioTarget}
              current={k.conceptRatio}
              percent
            />
          </div>
          <div className="mt-2.5">
            <KpiCard
              label="再来店率"
              value={`${k.returnRate}%`}
              target={k.returnRateTarget}
              current={k.returnRate}
              percent
            />
          </div>
        </section>

        {/* 自分の順位（バッジ） */}
        <section className="rounded-2xl border-2 border-brand bg-brand/5 p-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-brand text-white flex flex-col items-center justify-center">
              <span className="text-[9px] leading-none mb-0.5">RANK</span>
              <span className="text-xl font-bold leading-none">#{myRank}</span>
            </div>
            <div className="flex-1">
              <p className="text-xs text-ink-muted">店内ランク</p>
              <p className="text-sm font-bold text-ink">
                {ranked.length}名中 {myRank}位
              </p>
              <p className="text-[10px] text-brand-dark mt-0.5">
                {myRank === 1
                  ? "🏆 トップ独走中！"
                  : myRank === 2
                  ? "あと少しでトップ"
                  : "次の一手で上昇できます"}
              </p>
            </div>
          </div>
        </section>

        {/* スタッフ別ランキング */}
        <section>
          <h2 className="text-sm font-bold text-ink mb-2 px-1">
            スタッフ別ランキング
          </h2>
          <div className="bg-white rounded-2xl border border-brand-light/60 divide-y divide-brand-light/40 overflow-hidden">
            {ranked.map((s, i) => {
              const isMe = s.id === ME.id;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 p-3 ${
                    isMe ? "bg-brand/5" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      i === 0
                        ? "bg-amber-100 text-amber-700"
                        : i === 1
                        ? "bg-gray-100 text-gray-700"
                        : i === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-canvas text-ink-muted"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-bold text-ink truncate">
                        {s.name}
                      </p>
                      {isMe && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand text-white font-bold">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-ink-muted">
                      {s.customers}名 / コンセプト{s.conceptRatio}% / 再来{s.returnRate}%
                    </p>
                  </div>
                  <p className="text-sm font-bold text-brand-dark shrink-0">
                    ¥{(s.sales / 10000).toFixed(0)}万
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  target,
  current,
  percent = false,
  format,
  accent = false,
}: {
  label: string;
  value: string;
  target: number;
  current: number;
  percent?: boolean;
  format?: "money";
  accent?: boolean;
}) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const achieved = current >= target;
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
        className={`text-2xl font-bold leading-tight ${
          accent ? "text-white" : "text-ink"
        }`}
      >
        {value}
      </p>
      <div className="mt-2">
        <div
          className={`h-1.5 rounded-full overflow-hidden ${
            accent ? "bg-white/20" : "bg-canvas"
          }`}
        >
          <div
            className={`h-full ${
              achieved
                ? "bg-green-500"
                : accent
                ? "bg-white"
                : "bg-brand"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p
          className={`text-[9px] mt-1 ${
            accent ? "text-white/70" : "text-ink-muted"
          }`}
        >
          目標達成 {pct}%{" "}
          {achieved && <span className="text-green-300">✓</span>}
        </p>
      </div>
    </div>
  );
}
