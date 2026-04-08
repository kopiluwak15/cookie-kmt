"use client";

import Link from "next/link";
import { useState } from "react";
import { TICKET_TEMPLATES } from "@/lib/tickets-mock";

/**
 * スタッフ用 チケット発行画面
 *
 * 想定動線:
 *   施術ログ完了 → このページ → 顧客選択 → テンプレ選択 → 発行
 *
 * 実運用では:
 *   1. 顧客IDがクエリで渡ってくる（?customer=xxx）
 *   2. POST /api/tickets で tickets行をinsert
 *   3. LINE Messaging API で BBD LINE 配信
 */

const DUMMY_CUSTOMER = {
  id: "C-000123",
  name: "山田 花子",
  lastVisit: "2026-04-08",
  lastMenu: "髪質改善ストレート",
};

export default function TicketIssuePage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [sendLine, setSendLine] = useState(true);
  const [done, setDone] = useState(false);

  const toggle = (type: string) =>
    setSelected((prev) =>
      prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type],
    );

  const submit = () => {
    // TODO: POST /api/tickets { customerId, types: selected, sendLine }
    setDone(true);
  };

  if (done) {
    return (
      <main className="min-h-screen bg-canvas flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-lg font-bold text-ink mb-2">
            チケット {selected.length}枚を発行しました
          </h1>
          <p className="text-sm text-ink-muted mb-1">
            発行先: {DUMMY_CUSTOMER.name} 様
          </p>
          {sendLine && (
            <p className="text-xs text-brand-dark mb-4">
              LINE通知を送信しました
            </p>
          )}
          <Link
            href="/staff/home"
            className="inline-block mt-4 px-6 py-3 rounded-xl bg-brand text-white text-sm font-bold"
          >
            ホームに戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas pb-32">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            href="/staff/home"
            className="text-brand-dark text-sm font-bold"
          >
            ← 戻る
          </Link>
          <p className="text-sm font-bold text-ink flex-1 text-center pr-10">
            チケット発行
          </p>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
        {/* 顧客カード */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-4">
          <p className="text-[10px] text-ink-muted mb-1">発行先</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-ink">
                {DUMMY_CUSTOMER.name}
              </p>
              <p className="text-[10px] text-ink-muted">
                {DUMMY_CUSTOMER.id} / 直近: {DUMMY_CUSTOMER.lastMenu}
              </p>
            </div>
            <button
              type="button"
              className="text-[11px] px-3 py-1.5 rounded-full border border-brand-light/60 text-ink-muted"
            >
              変更
            </button>
          </div>
        </section>

        {/* テンプレ選択 */}
        <section>
          <h2 className="text-sm font-bold text-ink mb-2 px-1">
            発行するチケット（複数可）
          </h2>
          <div className="space-y-3">
            {TICKET_TEMPLATES.map((tpl) => {
              const active = selected.includes(tpl.type);
              const recommended = tpl.defaultIssueAfter.some((m) =>
                DUMMY_CUSTOMER.lastMenu.includes(m.replace("コンセプト矯正", "")),
              );
              return (
                <button
                  key={tpl.type}
                  type="button"
                  onClick={() => toggle(tpl.type)}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition ${
                    active
                      ? "border-brand bg-brand/5"
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
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-ink">
                          {tpl.title}
                        </p>
                        {recommended && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 font-bold">
                            おすすめ
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-muted leading-relaxed mb-2">
                        {tpl.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/10 text-brand-dark font-bold">
                          {tpl.discountRate
                            ? `${tpl.discountRate}% OFF`
                            : `¥${tpl.discountAmount?.toLocaleString()} OFF`}
                        </span>
                        <span className="text-[10px] text-ink-muted">
                          有効期間 {tpl.validMonths}ヶ月
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* LINE送信トグル */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-4">
          <label className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ink">LINE通知を送信</p>
              <p className="text-[10px] text-ink-muted mt-0.5">
                BBD LINE で即座にお客様へ届きます
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSendLine((v) => !v)}
              className={`w-12 h-7 rounded-full relative transition ${
                sendLine ? "bg-brand" : "bg-brand-light/60"
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition ${
                  sendLine ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </label>
        </section>
      </div>

      {/* 下部固定アクション */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-brand-light/60 px-4 py-3 z-20">
        <div className="max-w-xl mx-auto">
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={submit}
            className="w-full py-3.5 rounded-xl bg-brand text-white text-sm font-bold disabled:opacity-40"
          >
            {selected.length > 0
              ? `✓ ${selected.length}枚を発行する`
              : "チケットを選択してください"}
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </main>
  );
}
