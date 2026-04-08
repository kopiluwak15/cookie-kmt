import Link from "next/link";
import {
  ME,
  TODAY_CHECKINS,
  TODAY_LOGS,
  TODAY_SUMMARY,
  TODAY_UPCOMING,
} from "@/lib/staff-mock";

export default function StaffTreatmentLogHome() {
  const today = "2026年4月8日（水）";

  return (
    <main className="min-h-screen bg-canvas pb-24">
      {/* ヘッダー */}
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">
              {ME.name.charAt(0)}
            </div>
            <div>
              <p className="text-[10px] tracking-widest text-brand-dark leading-none mb-0.5">
                COOKIE 熊本
              </p>
              <p className="text-sm font-bold text-ink leading-tight">
                {ME.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="通知"
            className="relative w-10 h-10 rounded-full bg-canvas border border-brand-light/60 flex items-center justify-center"
          >
            <span className="text-lg">🔔</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* 日付 + 本日サマリー */}
        <section>
          <p className="text-xs text-ink-muted mb-2">{today}</p>
          <div className="bg-white rounded-2xl border border-brand-light/60 p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <SummaryCell
                value={`¥${(TODAY_SUMMARY.sales / 1000).toFixed(0)}k`}
                label="売上"
              />
              <SummaryCell
                value={`${TODAY_SUMMARY.doneCount} / ${TODAY_SUMMARY.totalScheduled}`}
                label="完了/予定"
                accent
              />
              <SummaryCell
                value={`${TODAY_SUMMARY.conceptCount}`}
                label="コンセプト"
              />
            </div>
          </div>
        </section>

        {/* チェックイン待ち */}
        <section>
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h2 className="text-sm font-bold text-ink">
              チェックイン中
              <span className="ml-2 text-brand-dark">
                {TODAY_CHECKINS.length}
              </span>
              名
            </h2>
            <span className="text-[10px] text-ink-muted">タップで施術開始</span>
          </div>
          {TODAY_CHECKINS.length === 0 ? (
            <EmptyCard text="チェックイン中のお客様はいません" />
          ) : (
            <div className="space-y-2">
              {TODAY_CHECKINS.map((c) => (
                <Link
                  key={c.id}
                  href={`/staff/log/new?customer=${c.customerId}`}
                  className="block bg-white rounded-2xl border-2 border-amber-300 active:bg-amber-50 transition"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-bold text-ink truncate">
                          {c.name}
                        </p>
                        <span className="text-[10px] text-ink-muted shrink-0">
                          ({c.visitCount}回)
                        </span>
                        {c.isConcept && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand/10 text-brand-dark border border-brand/30 font-bold shrink-0">
                            コンセプト
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-muted truncate">
                        {c.menuPlanned}
                      </p>
                      <p className="text-[10px] text-amber-700 font-bold mt-0.5">
                        {c.checkedInAt} チェックイン
                        {c.ticketsHeld > 0 && (
                          <span className="ml-2">🎫 {c.ticketsHeld}枚仮押さえ</span>
                        )}
                      </p>
                    </div>
                    <span className="text-brand-dark text-xl shrink-0">▶</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 本日記録済み */}
        <section>
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h2 className="text-sm font-bold text-ink">
              本日記録済み
              <span className="ml-2 text-brand-dark">
                {TODAY_LOGS.length}
              </span>
              件
            </h2>
          </div>
          {TODAY_LOGS.length === 0 ? (
            <EmptyCard text="まだ記録がありません" />
          ) : (
            <div className="space-y-2">
              {TODAY_LOGS.map((log) => (
                <Link
                  key={log.id}
                  href={`/staff/log/${log.id}`}
                  className="block bg-white rounded-2xl border border-brand-light/60 active:bg-canvas transition"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-base shrink-0">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-bold text-ink truncate">
                          {log.name}
                        </p>
                        <span className="text-[10px] text-ink-muted shrink-0">
                          ({log.visitCount}回)
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted truncate">
                        {log.menus.join(" / ")}
                      </p>
                      <p className="text-[10px] text-ink-muted">
                        {log.startedAt}–{log.finishedAt}
                        {log.isConcept && !log.hasJudgmentLog && (
                          <span className="ml-2 text-amber-700 font-bold">
                            ⚠ 判断ログ未記入
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-brand-dark shrink-0">
                      ¥{log.total.toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 本日の予約（未来） */}
        <section>
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h2 className="text-sm font-bold text-ink">
              この後の予約
              <span className="ml-2 text-brand-dark">
                {TODAY_UPCOMING.length}
              </span>
              件
            </h2>
          </div>
          <div className="bg-white rounded-2xl border border-brand-light/60 divide-y divide-brand-light/40 overflow-hidden">
            {TODAY_UPCOMING.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3"
              >
                <div className="w-12 shrink-0 text-center">
                  <p className="text-base font-bold text-ink leading-none">
                    {u.appointmentAt}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-sm font-semibold text-ink truncate">
                      {u.name}
                    </p>
                    <span className="text-[10px] text-ink-muted shrink-0">
                      ({u.visitCount}回)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {u.isConcept && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand/10 text-brand-dark border border-brand/30 shrink-0">
                        コンセプト
                      </span>
                    )}
                    <p className="text-[11px] text-ink-muted truncate">
                      {u.menuPlanned}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* フローティングボタン: 新規施術ログ */}
      <Link
        href="/staff/log/new"
        className="fixed bottom-20 right-4 z-20 w-14 h-14 rounded-full bg-brand text-white shadow-lg flex items-center justify-center text-2xl font-bold active:scale-95 transition"
        aria-label="新規施術ログ"
      >
        ＋
      </Link>
    </main>
  );
}

function SummaryCell({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className={`text-xl font-bold leading-tight ${
          accent ? "text-brand-dark" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] text-ink-muted mt-0.5">{label}</p>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-light/60 px-4 py-6 text-center">
      <p className="text-xs text-ink-muted">{text}</p>
    </div>
  );
}
