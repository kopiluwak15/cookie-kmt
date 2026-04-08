"use client";

import Link from "next/link";
import { useState } from "react";
import { STAFF_PERFORMANCE } from "@/lib/admin-mock";
import StaffNewModal from "./_components/StaffNewModal";

const ROLE_LABEL: Record<string, string> = {
  s1: "代表 / トップスタイリスト",
  s2: "スタイリスト",
  s3: "アシスタント / ジュニアスタイリスト",
};

export default function StaffListPage() {
  const [openNew, setOpenNew] = useState(false);

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-7xl mx-auto pl-16 lg:pl-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
              COOKIE 熊本 / ADMIN
            </p>
            <h1 className="text-lg font-bold text-ink">スタッフ管理</h1>
          </div>
          <button
            type="button"
            onClick={() => setOpenNew(true)}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-bold active:bg-brand-dark transition"
          >
            ＋ 新規登録
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* 統計サマリー */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <SummaryCard label="在籍スタッフ" value={`${STAFF_PERFORMANCE.length}名`} />
          <SummaryCard label="今月の合計売上" value={`¥${(STAFF_PERFORMANCE.reduce((s, x) => s + x.sales, 0) / 10000).toFixed(0)}万`} />
          <SummaryCard label="平均コンセプト率" value={`${Math.round(STAFF_PERFORMANCE.reduce((s, x) => s + x.conceptRatio, 0) / STAFF_PERFORMANCE.length)}%`} />
          <SummaryCard label="平均再来店率" value={`${Math.round(STAFF_PERFORMANCE.reduce((s, x) => s + x.returnRate, 0) / STAFF_PERFORMANCE.length)}%`} />
        </section>

        {/* スタッフ一覧テーブル */}
        <section>
          <div className="bg-white rounded-2xl border border-brand-light/60 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-canvas text-[10px] font-bold text-ink-muted border-b border-brand-light/40">
              <div className="col-span-4">スタッフ</div>
              <div className="col-span-2 text-right">売上</div>
              <div className="col-span-2 text-right">コンセプト</div>
              <div className="col-span-2 text-right">判断ログ</div>
              <div className="col-span-2 text-right">再来店</div>
            </div>

            {STAFF_PERFORMANCE.map((s) => (
              <Link
                key={s.staffId}
                href={`/admin/staff/${s.staffId}`}
                className="block border-b border-brand-light/40 last:border-0 active:bg-canvas transition"
              >
                <div className="md:hidden p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center text-base font-bold shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink truncate">
                        {s.name}
                      </p>
                      <p className="text-[10px] text-ink-muted truncate">
                        {ROLE_LABEL[s.staffId]}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-brand-dark shrink-0">
                      ¥{(s.sales / 10000).toFixed(0)}万
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-brand-light/40">
                    <Stat label="コンセプト" value={`${s.conceptRatio}%`} />
                    <Stat label="判断ログ"  value={`${s.judgmentLogRate}%`} />
                    <Stat label="再来店"    value={`${s.returnRate}%`} />
                  </div>
                </div>

                <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 items-center">
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink truncate">
                        {s.name}
                      </p>
                      <p className="text-[10px] text-ink-muted truncate">
                        {ROLE_LABEL[s.staffId]}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
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
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <StaffNewModal open={openNew} onClose={() => setOpenNew(false)} />
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-light/60 p-4">
      <p className="text-[10px] text-ink-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-ink">{value}</p>
      <p className="text-[9px] text-ink-muted">{label}</p>
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
