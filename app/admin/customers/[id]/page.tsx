"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import {
  ADMIN_CUSTOMERS,
  STATUS_COLOR,
  STATUS_LABEL,
} from "@/lib/customers-mock";
import { MOCK_TICKETS, formatDiscountLabel } from "@/lib/tickets-mock";

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const customer = ADMIN_CUSTOMERS.find((c) => c.id === id);

  if (!customer) return notFound();

  const tickets = MOCK_TICKETS.filter((t) => t.customerId === customer.id);

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-4xl mx-auto pl-16 lg:pl-6 flex items-center gap-3">
          <Link
            href="/admin/customers"
            className="text-xs text-brand-dark font-bold"
          >
            ← 顧客一覧
          </Link>
          <div className="flex-1" />
          <button
            type="button"
            className="px-3 py-2 rounded-xl border border-brand-light/60 text-xs font-bold text-ink active:bg-canvas transition"
          >
            編集
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* プロフィール */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-brand text-white flex items-center justify-center text-2xl font-bold shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl font-bold text-ink">{customer.name}</h1>
                {customer.isConcept && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand/10 text-brand-dark">
                    コンセプト顧客
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[customer.status]}`}
                >
                  {STATUS_LABEL[customer.status]}
                </span>
              </div>
              <p className="text-[11px] text-ink-muted">
                {customer.id} / {customer.kana}
              </p>
              <p className="text-[11px] text-ink-muted mt-1">
                担当: {customer.mainStaff}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-brand-light/40">
            <Stat label="来店回数" value={`${customer.visitCount}回`} />
            <Stat label="累計支出" value={`¥${(customer.totalSpend / 10000).toFixed(1)}万`} />
            <Stat label="最終来店" value={customer.lastVisit} />
            <Stat label="初回来店" value={customer.joinedAt} />
          </div>
        </section>

        {/* 連絡先 */}
        <section>
          <h2 className="text-[10px] tracking-wider font-bold text-ink-muted mb-2 px-1">
            連絡先
          </h2>
          <div className="bg-white rounded-2xl border border-brand-light/60 p-5 space-y-2">
            <Row label="電話" value={customer.phone ?? "—"} />
            <Row label="メール" value={customer.email ?? "—"} />
            <Row
              label="LINE連携"
              value={customer.lineLinked ? "✓ 連携済み" : "未連携"}
              valueColor={customer.lineLinked ? "text-green-600" : "text-ink-muted"}
            />
          </div>
        </section>

        {/* 悩み・施術 */}
        <section>
          <h2 className="text-[10px] tracking-wider font-bold text-ink-muted mb-2 px-1">
            悩み・施術
          </h2>
          <div className="bg-white rounded-2xl border border-brand-light/60 p-5">
            <p className="text-[11px] text-ink-muted mb-1">主な悩み</p>
            <p className="text-sm font-bold text-ink">{customer.concern}</p>
            {customer.nextScheduled && (
              <div className="mt-4 pt-4 border-t border-brand-light/40">
                <p className="text-[11px] text-ink-muted mb-1">次回予定</p>
                <p className="text-sm font-bold text-brand-dark">
                  {customer.nextScheduled}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* チケット */}
        <section>
          <h2 className="text-[10px] tracking-wider font-bold text-ink-muted mb-2 px-1">
            保有チケット
          </h2>
          <div className="bg-white rounded-2xl border border-brand-light/60 overflow-hidden divide-y divide-brand-light/40">
            {tickets.length === 0 ? (
              <p className="text-center text-xs text-ink-muted py-6">
                チケットはありません
              </p>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">
                      {t.title}
                    </p>
                    <p className="text-[10px] text-ink-muted mt-0.5">
                      状態: {t.status} / 有効期限: {t.expiresAt.slice(0, 10)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-brand-dark shrink-0">
                    {formatDiscountLabel(t)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-ink-muted mb-0.5">{label}</p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  valueColor = "text-ink",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[11px] text-ink-muted">{label}</p>
      <p className={`text-xs font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
