import Link from "next/link";
import { notFound } from "next/navigation";
import { findVisit } from "@/lib/mypage-mock";

// TODO: id → /api/visits/[id] で取得 + LIFF認証で本人確認

export default function VisitDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const visit = findVisit(params.id);
  if (!visit) notFound();

  return (
    <main className="min-h-screen bg-canvas pb-20">
      {/* ヘッダー */}
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            href="/liff/mypage"
            className="text-brand-dark text-sm font-bold"
          >
            ← 戻る
          </Link>
          <p className="text-sm font-bold text-ink flex-1 text-center pr-10">
            ご来店詳細
          </p>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
        {/* 来店サマリー */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] text-ink-muted mb-0.5">来店日</p>
              <p className="text-lg font-bold text-ink">{visit.date}</p>
            </div>
            {visit.isConcept && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand/10 text-brand-dark border border-brand/30 font-bold">
                コンセプト
              </span>
            )}
          </div>

          <div className="space-y-1 pb-3 mb-3 border-b border-brand-light/40">
            {visit.menus.map((m) => (
              <p key={m} className="text-sm text-ink">
                ・{m}
              </p>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-muted">担当: {visit.staffName}</p>
            <p className="text-base font-bold text-brand-dark">
              ¥{visit.totalPrice.toLocaleString()}
            </p>
          </div>
        </section>

        {/* 施術メモ */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-5">
          <p className="text-[10px] tracking-wider text-brand-dark font-bold mb-2">
            TREATMENT NOTE
          </p>
          <h2 className="text-sm font-bold text-ink mb-3">施術メモ</h2>
          <p className="text-sm text-ink leading-loose">{visit.summary}</p>
        </section>

        {/* スタッフからのコメント */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-lg">💬</span>
            <h2 className="text-base font-bold text-ink">
              スタッフからのコメント
            </h2>
            <span className="text-[10px] text-ink-muted">
              {visit.staffComments.length}件
            </span>
          </div>
          <div className="space-y-3">
            {visit.staffComments.map((c, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-brand-light/60 p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand-dark text-sm font-bold">
                    {c.staffName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ink">
                      {c.staffName} スタイリスト
                    </p>
                    <p className="text-[10px] text-ink-muted">
                      {formatDateTime(c.postedAt)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-ink leading-loose whitespace-pre-wrap">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 次回提案 */}
        {visit.nextSuggestion && (
          <section className="bg-brand/5 rounded-2xl border border-brand/20 p-5">
            <p className="text-[10px] tracking-wider text-brand-dark font-bold mb-2">
              NEXT VISIT
            </p>
            <h2 className="text-sm font-bold text-ink mb-3">
              次回のおすすめ
            </h2>
            <div className="bg-white rounded-xl p-4 mb-3">
              <p className="text-base font-bold text-ink mb-1">
                {visit.nextSuggestion.menu}
              </p>
              <p className="text-xs text-brand-dark font-bold">
                時期目安: {visit.nextSuggestion.timing}
              </p>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              {visit.nextSuggestion.reason}
            </p>
          </section>
        )}

        {/* アクション */}
        <div className="grid grid-cols-1 gap-3 pt-2">
          <a
            href="https://line.me/"
            className="rounded-2xl bg-brand text-white px-4 py-4 text-center text-sm font-bold"
          >
            このメニューで予約する
          </a>
          <Link
            href="/liff/mypage"
            className="rounded-2xl bg-white border border-brand-light/60 px-4 py-3 text-center text-sm font-bold text-ink"
          >
            マイページに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}/${mm}/${dd} ${hh}:${mi}`;
}
