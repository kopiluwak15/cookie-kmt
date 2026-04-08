"use client";

import { useEffect, useState } from "react";

/**
 * LIFFチェックイン入口
 *
 * 実運用フロー:
 *  1. 顧客がQRを読み込む
 *  2. LINEログイン（LIFF）→ LINE userId 取得
 *  3. サーバーで customers テーブルに userId 存在確認
 *     - 存在しない                       → /liff/register（カルテ作成）
 *     - 存在 + 未使用チケットあり        → /liff/welcome?tickets=1
 *     - 存在のみ                         → /liff/welcome
 *
 * 現在はDB未接続のためダミー。
 *  ?new=1     → 初回扱いで /liff/register
 *  ?ticket=0  → チケットなし扱い
 *  デフォルト → チケットありの再来店扱い
 */
export default function LiffCheckinPage() {
  const [message, setMessage] = useState("LINE認証中...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forceNew = params.get("new") === "1";
    const noTicket = params.get("ticket") === "0";

    const t1 = setTimeout(() => setMessage("お客様情報を確認中..."), 500);
    const t2 = setTimeout(
      () => setMessage("ご利用可能なチケットを確認中..."),
      900,
    );
    const t3 = setTimeout(() => {
      if (forceNew) {
        window.location.href = "/liff/register";
      } else if (noTicket) {
        window.location.href = "/liff/welcome";
      } else {
        // ダミー: チケットありの再来店扱い
        window.location.href = "/liff/welcome?tickets=1";
      }
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-light/40 border-t-brand rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-ink-muted">{message}</p>
      </div>
    </main>
  );
}
