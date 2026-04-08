import Link from "next/link";
import { MOCK_HISTORY, MOCK_USER } from "@/lib/mypage-mock";
import {
  daysUntilExpiry,
  formatDiscountLabel,
  getActiveTickets,
} from "@/lib/tickets-mock";

// TODO: LIFF init → liff.getProfile() で lineId 取得
//       lineId → /api/customers/by-line で顧客を引く
//       履歴は /api/visits?customerId=... で取得

export default function MyPage() {
  const user = MOCK_USER;
  const history = MOCK_HISTORY;
  const tickets = getActiveTickets(user.customerNo);

  return (
    <main className="min-h-screen bg-canvas pb-20">
      {/* ヘッダー */}
      <header className="bg-white border-b border-brand-light/40">
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
            COOKIE 熊本
          </p>
          <p className="text-sm font-bold text-ink">マイページ</p>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
        {/* プロフィールカード */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center text-brand-dark text-xl font-bold">
              {user.displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-ink-muted">{user.customerNo}</p>
              <p className="text-base font-bold text-ink truncate">
                {user.displayName} 様
              </p>
              <p className="text-[11px] text-ink-muted">
                ご来店 {user.visitCount} 回 / {user.joinedAt} ご登録
              </p>
            </div>
          </div>

          {user.nextRecommendDate && (
            <div className="mt-4 rounded-xl bg-brand/5 border border-brand/20 px-4 py-3">
              <p className="text-[10px] text-brand-dark font-bold mb-0.5">
                次回おすすめ時期
              </p>
              <p className="text-sm font-bold text-ink">
                {user.nextRecommendDate} 頃
              </p>
            </div>
          )}
        </section>

        {/* チケット */}
        {tickets.length > 0 && (
          <section>
            <div className="flex items-baseline gap-2 mb-3 px-1">
              <h2 className="text-base font-bold text-ink">
                🎫 ご利用可能なチケット
              </h2>
              <p className="text-[11px] text-ink-muted">{tickets.length}枚</p>
            </div>
            <div className="space-y-3">
              {tickets.map((t) => {
                const days = daysUntilExpiry(t.expiresAt);
                const urgent = days <= 14;
                return (
                  <div
                    key={t.id}
                    className={`rounded-2xl border-2 p-4 ${
                      urgent
                        ? "border-amber-400 bg-amber-50"
                        : "border-brand bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] tracking-wider text-brand-dark font-bold mb-0.5">
                          {formatDiscountLabel(t)}
                        </p>
                        <p className="text-sm font-bold text-ink leading-tight">
                          {t.title}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[9px] px-2 py-1 rounded-full font-bold ${
                          urgent
                            ? "bg-amber-600 text-white"
                            : "bg-brand/10 text-brand-dark border border-brand/30"
                        }`}
                      >
                        {days > 0 ? `あと${days}日` : "本日まで"}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-muted leading-relaxed mb-3">
                      {t.description}
                    </p>
                    <p className="text-[10px] text-ink-muted">
                      期限: {t.expiresAt.slice(0, 10)}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-ink-muted/70 text-center mt-3">
              ご来店時にCheck-inでご利用いただけます
            </p>
          </section>
        )}

        {/* クイックアクション */}
        <section className="grid grid-cols-2 gap-3">
          <a
            href="https://line.me/"
            className="rounded-2xl bg-brand text-white px-4 py-4 text-center"
          >
            <p className="text-[10px] tracking-wider mb-0.5">RESERVATION</p>
            <p className="text-sm font-bold">ご予約・お問い合わせ</p>
          </a>
          <Link
            href="/liff/concept"
            className="rounded-2xl bg-white border-2 border-brand-light/60 px-4 py-4 text-center"
          >
            <p className="text-[10px] tracking-wider mb-0.5 text-brand-dark">
              SURVEY
            </p>
            <p className="text-sm font-bold text-ink">お悩みアンケート</p>
          </Link>
        </section>

        {/* 来店履歴 */}
        <section>
          <div className="flex items-baseline justify-between mb-3 px-1">
            <h2 className="text-base font-bold text-ink">ご来店履歴</h2>
            <p className="text-[11px] text-ink-muted">{history.length}件</p>
          </div>
          <div className="space-y-3">
            {history.map((v) => {
              const newCount = v.staffComments.length;
              return (
                <Link
                  key={v.id}
                  href={`/liff/mypage/${v.id}`}
                  className="block bg-white rounded-2xl border border-brand-light/60 p-4 active:bg-brand/5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-ink">{v.date}</p>
                    {v.isConcept && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand/10 text-brand-dark border border-brand/30 font-bold">
                        コンセプト
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mb-3">
                    {v.menus.map((m) => (
                      <p key={m} className="text-xs text-ink leading-relaxed">
                        ・{m}
                      </p>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-brand-light/40">
                    <p className="text-[11px] text-ink-muted">
                      担当: {v.staffName}
                      {newCount > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-brand-dark font-bold">
                          💬 {newCount}件
                        </span>
                      )}
                    </p>
                    <p className="text-xs font-bold text-brand-dark">
                      ¥{v.totalPrice.toLocaleString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* フッター注記 */}
        <p className="text-[10px] text-ink-muted/70 text-center pt-2">
          表示内容はLINE連携アカウントの履歴です
        </p>
      </div>
    </main>
  );
}
