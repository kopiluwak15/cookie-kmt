"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim() && password.length >= 6 && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    // TODO: POST /api/auth/staff/login
    await new Promise((r) => setTimeout(r, 500));

    // モック: 初期パスワード `123456` の場合は強制リセット画面へ
    if (password === "123456") {
      router.push(
        `/staff/login/reset?email=${encodeURIComponent(email)}&first=1`,
      );
      return;
    }
    // 通常ログイン成功
    router.push("/staff");
  };

  const loginWithLine = () => {
    // TODO: LIFF / LINE Login
    // window.location.href = "/api/auth/line/login";
    alert("LINEログインは実装予定です");
  };

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.4em] text-brand-dark mb-1">
            COOKIE 熊本
          </p>
          <h1 className="text-2xl font-bold text-ink">スタッフログイン</h1>
        </div>

        <div className="bg-white rounded-2xl border border-brand-light/60 p-6 shadow-sm">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@cookie.hair"
                autoComplete="email"
                className="w-full bg-white border border-brand-light/60 rounded-xl px-4 py-3 text-sm text-ink outline-none focus:border-brand-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                autoComplete="current-password"
                className="w-full bg-white border border-brand-light/60 rounded-xl px-4 py-3 text-sm text-ink outline-none focus:border-brand-dark"
              />
              <p className="text-[10px] text-ink-muted mt-1.5">
                初回ログインの方は管理者から共有された初期パスワード（123456）を入力してください
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-ink text-white text-sm font-bold disabled:opacity-40 active:bg-ink-muted transition"
            >
              {submitting ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          {/* 区切り */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-brand-light/60" />
            <p className="text-[10px] text-ink-muted">または</p>
            <div className="flex-1 h-px bg-brand-light/60" />
          </div>

          {/* LINEログイン */}
          <button
            type="button"
            onClick={loginWithLine}
            className="w-full py-3 rounded-xl bg-[#06C755] text-white text-sm font-bold active:opacity-80 transition flex items-center justify-center gap-2"
          >
            <span className="text-base font-bold">L</span>
            LINEでログイン
          </button>
          <p className="text-[10px] text-ink-muted mt-2 text-center">
            ※ 事前にマイページからLINE連携が必要です
          </p>
        </div>

        <p className="text-[10px] text-ink-muted text-center mt-6">
          パスワードを忘れた場合は{" "}
          <Link href="/staff/login/forgot" className="text-brand-dark underline">
            こちら
          </Link>
        </p>
      </div>
    </main>
  );
}
