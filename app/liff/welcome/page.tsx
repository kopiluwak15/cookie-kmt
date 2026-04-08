"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MOCK_USER } from "@/lib/mypage-mock";
import {
  daysUntilExpiry,
  formatDiscountLabel,
  getActiveTickets,
  type Ticket,
} from "@/lib/tickets-mock";

/**
 * Check-in 完了画面
 *
 * URLパラメータ:
 *   ?tickets=1  → 利用可能チケットを表示して仮押さえできる
 *
 * 仮押さえフロー:
 *   1. お客様が「今日使う」をタップ → tickets.status = "held"
 *   2. スタッフが施術ログ確定時に → "used" に変更（未実装、施術ログ画面で）
 */
export default function CheckinWelcomePage() {
  const [showTickets, setShowTickets] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [held, setHeld] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tickets") === "1") {
      const t = getActiveTickets(MOCK_USER.customerNo);
      if (t.length > 0) {
        setTickets(t);
        setShowTickets(true);
      }
    }
  }, []);

  const toggle = (id: string) =>
    setHeld((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const submit = () => {
    // TODO: POST /api/tickets/hold で status="held" に更新
    setConfirmed(true);
  };

  // ===== チケット仮押さえ後 / チケットなしの完了画面 =====
  if (!showTickets || confirmed) {
    return (
      <main className="min-h-screen bg-canvas flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 mx-auto mb-5 flex items-center justify-center">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-ink mb-3">
            Check IN ありがとうございます
          </h1>
          {confirmed && held.length > 0 && (
            <div className="rounded-2xl bg-brand/5 border border-brand/30 px-4 py-3 mb-4">
              <p className="text-xs font-bold text-brand-dark">
                🎫 チケット {held.length}枚を本日のご来店で使用予定
              </p>
            </div>
          )}
          <p className="text-sm text-ink-muted leading-relaxed">
            スタッフがお声がけするまで
            <br />
            少々お待ちください。
          </p>
          <Link
            href="/liff/mypage"
            className="inline-block mt-6 text-xs text-brand-dark underline"
          >
            マイページを見る
          </Link>
        </div>
      </main>
    );
  }

  // ===== チケット選択画面 =====
  return (
    <main className="min-h-screen bg-canvas pb-32">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
            COOKIE 熊本
          </p>
          <p className="text-sm font-bold text-ink">Check IN</p>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-green-100 mx-auto mb-3 flex items-center justify-center">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="text-lg font-bold text-ink mb-1">
            Check IN を受け付けました
          </h1>
          <p className="text-xs text-ink-muted">
            {MOCK_USER.displayName} 様、ようこそ
          </p>
        </div>

        <div className="rounded-2xl bg-brand/5 border border-brand/30 p-4 mb-4">
          <p className="text-sm font-bold text-ink mb-1">
            🎫 ご利用可能なチケットがあります
          </p>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            本日のご来店で使うチケットを選んでください。
            <br />
            タップしたものは仮押さえ状態となり、施術完了時に正式にご利用となります。
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {tickets.map((t) => {
            const active = held.includes(t.id);
            const days = daysUntilExpiry(t.expiresAt);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className={`w-full text-left rounded-2xl border-2 p-4 transition ${
                  active
                    ? "border-brand bg-brand/10"
                    : "border-brand-light/60 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5 ${
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-brand-light"
                    }`}
                  >
                    {active && <span className="text-sm font-bold">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] tracking-wider text-brand-dark font-bold mb-0.5">
                      {formatDiscountLabel(t)}
                    </p>
                    <p className="text-sm font-bold text-ink leading-tight mb-1">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-ink-muted leading-relaxed mb-2">
                      {t.description}
                    </p>
                    <p className="text-[10px] text-ink-muted">
                      期限: {t.expiresAt.slice(0, 10)}（あと{days}日）
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 下部固定アクション */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-brand-light/60 px-4 py-3 z-20">
        <div className="max-w-xl mx-auto flex flex-col gap-2">
          {held.length > 0 && (
            <p className="text-[11px] text-brand-dark text-center font-bold">
              {held.length}枚を選択中
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            className="w-full py-3.5 rounded-xl bg-brand text-white text-sm font-bold"
          >
            {held.length > 0
              ? `✓ ${held.length}枚使用してCheck-in完了`
              : "チケットを使わず完了"}
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </main>
  );
}
