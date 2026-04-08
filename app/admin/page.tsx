"use client";

import Link from "next/link";
import { useState } from "react";
import DateRangePicker, {
  DEFAULT_PRESETS,
  type DateRange,
} from "@/components/DateRangePicker";
import {
  ALERTS,
  CONCERNS_RESOLVED,
  NORTH_STAR,
  RECENT_ACTIVITIES,
  STAFF_PERFORMANCE,
} from "@/lib/admin-mock";

export default function AdminDashboard() {
  const monthPreset = DEFAULT_PRESETS.find((p) => p.key === "month")!;
  const [range, setRange] = useState<DateRange>(monthPreset.range());
  const [activePreset, setActivePreset] = useState<string | null>("month");

  return (
    <main className="min-h-screen bg-canvas pb-16">
      {/* ヘッダー */}
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-7xl mx-auto pl-16 lg:pl-6">
          <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
            COOKIE 熊本 / ADMIN
          </p>
          <h1 className="text-lg font-bold text-ink">管理ダッシュボード</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
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

        {/* North Star KPIs */}
        <section>
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-base font-bold text-ink">North Star KPI</h2>
            <p className="text-[11px] text-ink-muted flex-1">
              「悩み → 施術 → 再来店」の再現性
            </p>
            <Link
              href="/admin/analytics"
              className="text-[11px] font-bold text-brand-dark"
            >
              詳細分析 →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiBigCard
              label="コンセプト売上構成比"
              value={NORTH_STAR.conceptRatio}
              unit="%"
              target={NORTH_STAR.conceptRatioTarget}
              delta={NORTH_STAR.conceptRatioDelta}
            />
            <KpiBigCard
              label="再来店率"
              value={NORTH_STAR.returnRate}
              unit="%"
              target={NORTH_STAR.returnRateTarget}
              delta={NORTH_STAR.returnRateDelta}
            />
            <KpiBigCard
              label="判断ログ充足率"
              value={NORTH_STAR.judgmentLogRate}
              unit="%"
              target={NORTH_STAR.judgmentLogRateTarget}
              delta={NORTH_STAR.judgmentLogRateDelta}
            />
            <KpiBigCard
              label="コンセプト顧客LTV"
              value={Math.round(NORTH_STAR.conceptLtv / 1000)}
              unit="千円"
              target={Math.round(NORTH_STAR.conceptLtvTarget / 1000)}
              delta={NORTH_STAR.conceptLtvDelta}
            />
          </div>
        </section>

        {/* アラート（恐怖型動機への可視化） */}
        <section>
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-base font-bold text-ink">⚠️ アラート</h2>
            <p className="text-[11px] text-ink-muted flex-1">
              異常を早期に検知 / {ALERTS.length}件
            </p>
            <Link
              href="/admin/alerts"
              className="text-[11px] font-bold text-brand-dark"
            >
              全件表示 →
            </Link>
          </div>
          <div className="space-y-2">
            {ALERTS.map((a) => (
              <div
                key={a.id}
                className={`rounded-2xl border-l-4 bg-white p-4 ${
                  a.severity === "high"
                    ? "border-l-red-500"
                    : a.severity === "mid"
                    ? "border-l-amber-500"
                    : "border-l-blue-400"
                } border-y border-r border-brand-light/40`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink mb-1">{a.title}</p>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      {a.detail}
                    </p>
                  </div>
                  {a.href && (
                    <Link
                      href={a.href}
                      className="shrink-0 text-[11px] font-bold text-brand-dark underline"
                    >
                      確認 →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2カラム: スタッフ別 + 悩み解決 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* スタッフ別パフォーマンス */}
          <section>
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-base font-bold text-ink">
                スタッフ別パフォーマンス
              </h2>
              <p className="text-[11px] text-ink-muted flex-1">努力の方向性</p>
              <Link
                href="/admin/staff"
                className="text-[11px] font-bold text-brand-dark"
              >
                スタッフ管理 →
              </Link>
            </div>
            <div className="bg-white rounded-2xl border border-brand-light/60 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-canvas text-[10px] font-bold text-ink-muted border-b border-brand-light/40">
                <div className="col-span-3">スタッフ</div>
                <div className="col-span-3 text-right">売上</div>
                <div className="col-span-2 text-right">コンセプト</div>
                <div className="col-span-2 text-right">判断ログ</div>
                <div className="col-span-2 text-right">再来店</div>
              </div>
              {STAFF_PERFORMANCE.map((s) => (
                <Link
                  key={s.staffId}
                  href={`/admin/staff/${s.staffId}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-brand-light/40 last:border-0 active:bg-canvas transition items-center"
                >
                  <div className="col-span-3">
                    <p className="text-sm font-bold text-ink truncate">
                      {s.name}
                    </p>
                    <p className="text-[10px] text-ink-muted">
                      解決 {s.resolvedConcerns}件
                    </p>
                  </div>
                  <div className="col-span-3 text-right">
                    <p className="text-sm font-bold text-ink">
                      ¥{(s.sales / 10000).toFixed(0)}万
                    </p>
                    <p className="text-[10px] text-brand-dark">
                      +¥{(s.incentive / 1000).toFixed(0)}k
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <RatePill value={s.conceptRatio} threshold={60} />
                  </div>
                  <div className="col-span-2 text-right">
                    <RatePill value={s.judgmentLogRate} threshold={90} />
                  </div>
                  <div className="col-span-2 text-right">
                    <RatePill value={s.returnRate} threshold={75} />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* 解決した悩み */}
          <section>
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-base font-bold text-ink">
                解決した悩み
              </h2>
              <p className="text-[11px] text-ink-muted flex-1">使命感の積み上げ</p>
              <Link
                href="/admin/customers"
                className="text-[11px] font-bold text-brand-dark"
              >
                顧客管理 →
              </Link>
            </div>
            <div className="bg-white rounded-2xl border border-brand-light/60 p-4 space-y-3">
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

        {/* 直近のアクティビティ */}
        <section>
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-base font-bold text-ink">直近のアクティビティ</h2>
            <p className="text-[11px] text-ink-muted flex-1">業務の動き</p>
            <Link
              href="/admin/activities"
              className="text-[11px] font-bold text-brand-dark"
            >
              すべて表示 →
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-brand-light/60 divide-y divide-brand-light/40">
            {RECENT_ACTIVITIES.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                <span className="text-xl shrink-0">
                  {a.type === "judgment"
                    ? "📋"
                    : a.type === "comment"
                    ? "💬"
                    : a.type === "visit"
                    ? "✓"
                    : "✂️"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink">
                    <span className="font-bold">{a.staff}</span> →{" "}
                    <span className="text-ink-muted">{a.customer}</span>
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">{a.summary}</p>
                </div>
                <p className="text-[10px] text-ink-muted shrink-0">
                  {formatTime(a.at)}
                </p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}

// ===== 部品 =====

function KpiBigCard({
  label,
  value,
  unit,
  target,
  delta,
}: {
  label: string;
  value: number;
  unit: string;
  target: number;
  delta: number;
}) {
  const achieved = value >= target;
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div className="bg-white rounded-2xl border border-brand-light/60 p-5">
      <p className="text-[11px] text-ink-muted mb-2">{label}</p>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-bold text-ink">{value}</span>
        <span className="text-sm text-ink-muted">{unit}</span>
        <span
          className={`ml-auto text-[11px] font-bold ${
            delta >= 0 ? "text-green-600" : "text-red-500"
          }`}
        >
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
        </span>
      </div>
      <p className="text-[10px] text-ink-muted mb-2">
        目標 {target}
        {unit}
      </p>
      <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            achieved ? "bg-green-500" : "bg-brand"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RatePill({ value, threshold }: { value: number; threshold: number }) {
  const ok = value >= threshold;
  return (
    <span
      className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
        ok
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-amber-50 text-amber-700 border border-amber-200"
      }`}
    >
      {value}%
    </span>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}
