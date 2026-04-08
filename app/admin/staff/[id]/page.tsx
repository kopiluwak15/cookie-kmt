import Link from "next/link";
import { notFound } from "next/navigation";
import { findStaff, STAFF_PERFORMANCE } from "@/lib/admin-mock";

export default function StaffDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const staff = findStaff(params.id);
  if (!staff) notFound();

  // 簡易ランキング
  const ranking = [...STAFF_PERFORMANCE].sort((a, b) => b.sales - a.sales);
  const rank = ranking.findIndex((s) => s.staffId === staff.staffId) + 1;

  // 月次トレンド計算
  const latest = staff.monthly[staff.monthly.length - 1];
  const prev = staff.monthly[staff.monthly.length - 2];
  const salesDelta = prev
    ? Math.round(((latest.sales - prev.sales) / prev.sales) * 100)
    : 0;

  // チャート用最大値
  const maxSales = Math.max(...staff.monthly.map((m) => m.sales));
  const maxConcerns = Math.max(...staff.concernsResolved.map((c) => c.count));

  return (
    <main className="min-h-screen bg-canvas pb-16">
      {/* ヘッダー */}
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-7xl mx-auto flex items-center gap-4 pl-16 lg:pl-6">
          <Link
            href="/admin"
            className="text-brand-dark text-sm font-bold"
          >
            ← ダッシュボード
          </Link>
          <div className="h-6 w-px bg-brand-light/60" />
          <p className="text-[10px] tracking-[0.3em] text-brand-dark">
            STAFF DETAIL
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        {/* プロフィール */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-brand text-white flex items-center justify-center text-3xl font-bold shrink-0">
              {staff.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-ink-muted mb-0.5">
                {staff.role}
              </p>
              <h1 className="text-2xl font-bold text-ink mb-1">
                {staff.name}
              </h1>
              <p className="text-[11px] text-ink-muted">
                入社 {staff.joinedAt} / 在籍{" "}
                {Math.floor(
                  (Date.now() - new Date(staff.joinedAt).getTime()) /
                    (1000 * 60 * 60 * 24 * 365),
                )}
                年
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-ink-muted mb-1">店内ランク</p>
              <p className="text-3xl font-bold text-brand-dark">
                #{rank}
                <span className="text-sm text-ink-muted">
                  /{STAFF_PERFORMANCE.length}
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* 個人KPI */}
        <section>
          <h2 className="text-base font-bold text-ink mb-3">
            今月のパフォーマンス
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="売上"
              value={`¥${(latest.sales / 10000).toFixed(0)}万`}
              delta={salesDelta}
            />
            <KpiCard
              label="インセンティブ"
              value={`¥${(latest.incentive / 1000).toFixed(0)}k`}
              delta={salesDelta}
              accent
            />
            <KpiCard
              label="コンセプト率"
              value={`${latest.conceptRatio}%`}
              target={60}
              targetValue={latest.conceptRatio}
            />
            <KpiCard
              label="再来店率"
              value={`${latest.returnRate}%`}
              target={75}
              targetValue={latest.returnRate}
            />
          </div>
        </section>

        {/* 月次推移 + 強み課題 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 売上推移グラフ */}
          <section className="lg:col-span-2 bg-white rounded-2xl border border-brand-light/60 p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-bold text-ink">売上推移（6ヶ月）</h2>
              <p className="text-[10px] text-ink-muted">¥1,000単位</p>
            </div>
            <div className="flex items-end justify-between gap-2 h-40">
              {staff.monthly.map((m, i) => {
                const h = (m.sales / maxSales) * 100;
                const isLatest = i === staff.monthly.length - 1;
                return (
                  <div
                    key={m.month}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div className="text-[9px] text-ink-muted">
                      {Math.round(m.sales / 1000)}
                    </div>
                    <div
                      className={`w-full rounded-t ${
                        isLatest ? "bg-brand" : "bg-brand-light"
                      }`}
                      style={{ height: `${h}%` }}
                    />
                    <div className="text-[9px] text-ink-muted">
                      {m.month.slice(-2)}月
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 強み・課題 */}
          <section className="bg-white rounded-2xl border border-brand-light/60 p-5">
            <h2 className="text-sm font-bold text-ink mb-3">強み・課題</h2>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] tracking-wider font-bold text-green-700 mb-1">
                  STRENGTH
                </p>
                <ul className="space-y-1.5">
                  {staff.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="text-xs text-ink leading-relaxed flex gap-1.5"
                    >
                      <span className="text-green-600">●</span>
                      <span className="flex-1">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {staff.challenges.length > 0 && (
                <div>
                  <p className="text-[10px] tracking-wider font-bold text-amber-700 mb-1">
                    CHALLENGE
                  </p>
                  <ul className="space-y-1.5">
                    {staff.challenges.map((c, i) => (
                      <li
                        key={i}
                        className="text-xs text-ink leading-relaxed flex gap-1.5"
                      >
                        <span className="text-amber-600">●</span>
                        <span className="flex-1">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 解決した悩み */}
        <section>
          <h2 className="text-base font-bold text-ink mb-3">
            解決した悩み <span className="text-[11px] text-ink-muted font-normal">使命感の積み上げ</span>
          </h2>
          <div className="bg-white rounded-2xl border border-brand-light/60 p-5">
            {staff.concernsResolved.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-6">
                まだ記録がありません
              </p>
            ) : (
              <div className="space-y-3">
                {staff.concernsResolved.map((c) => {
                  const pct = (c.count / maxConcerns) * 100;
                  return (
                    <div key={c.category}>
                      <div className="flex items-baseline justify-between mb-1">
                        <p className="text-xs font-bold text-ink">
                          {c.category}
                        </p>
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
            )}
          </div>
        </section>

        {/* 担当顧客 + 最近の判断ログ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base font-bold text-ink">担当顧客</h2>
              <p className="text-[11px] text-ink-muted">
                {staff.customers.length}名
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-brand-light/60 divide-y divide-brand-light/40">
              {staff.customers.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/customers/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-canvas transition"
                >
                  <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand-dark text-sm font-bold shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-ink truncate">
                        {c.name}
                      </p>
                      {c.isConcept && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-brand/10 text-brand-dark border border-brand/30 font-bold shrink-0">
                          コンセプト
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-ink-muted">
                      {c.visitCount}回 / 直近 {c.lastVisit}
                    </p>
                  </div>
                  <span className="text-brand-dark text-xs">→</span>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base font-bold text-ink">最近の判断ログ</h2>
              <p className="text-[11px] text-ink-muted">
                {staff.recentJudgments.length}件
              </p>
            </div>
            <div className="space-y-2">
              {staff.recentJudgments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-brand-light/60 px-4 py-6 text-center">
                  <p className="text-xs text-ink-muted">
                    判断ログの記録がありません
                  </p>
                  <p className="text-[10px] text-amber-700 mt-1">
                    記入を推奨してください
                  </p>
                </div>
              ) : (
                staff.recentJudgments.map((j) => (
                  <div
                    key={j.id}
                    className="bg-white rounded-2xl border border-brand-light/60 p-4"
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <p className="text-xs font-bold text-ink">
                        {j.customer} <span className="text-ink-muted">/ {j.menu}</span>
                      </p>
                      <p className="text-[10px] text-ink-muted">
                        {j.at.slice(5, 10)}
                      </p>
                    </div>
                    <p className="text-xs text-ink leading-relaxed">
                      {j.note}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* アクション */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[
            { icon: "💰", label: "報酬詳細", href: `/admin/staff/${staff.staffId}/incentive` },
            { icon: "📋", label: "判断ログ全件", href: `/admin/staff/${staff.staffId}/judgments` },
            { icon: "📅", label: "シフト", href: `/admin/staff/${staff.staffId}/schedule` },
            { icon: "⚙️", label: "設定編集", href: `/admin/staff/${staff.staffId}/edit` },
          ].map((q) => (
            <Link
              key={q.label}
              href={q.href}
              className="bg-white rounded-2xl border border-brand-light/60 px-4 py-4 text-center active:bg-canvas transition"
            >
              <p className="text-2xl mb-1">{q.icon}</p>
              <p className="text-xs font-bold text-ink">{q.label}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

// ===== 部品 =====
function KpiCard({
  label,
  value,
  delta,
  target,
  targetValue,
  accent = false,
}: {
  label: string;
  value: string;
  delta?: number;
  target?: number;
  targetValue?: number;
  accent?: boolean;
}) {
  const achieved = target !== undefined && targetValue !== undefined && targetValue >= target;
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
      <p className="flex items-baseline gap-1">
        <span
          className={`text-2xl font-bold ${accent ? "text-white" : "text-ink"}`}
        >
          {value}
        </span>
        {delta !== undefined && (
          <span
            className={`ml-auto text-[10px] font-bold ${
              accent
                ? "text-white/90"
                : delta >= 0
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </p>
      {target !== undefined && (
        <p
          className={`text-[10px] mt-1 ${
            achieved
              ? "text-green-600 font-bold"
              : accent
              ? "text-white/70"
              : "text-ink-muted"
          }`}
        >
          目標 {target}% {achieved && "✓"}
        </p>
      )}
    </div>
  );
}
