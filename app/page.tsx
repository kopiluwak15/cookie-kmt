"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLineLogin = () => {
    // TODO: LINE OAuth flow
    alert("LINEログイン（未実装）");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 認証 → role に応じて /admin か /staff へ遷移
    alert(`ログイン（未実装）\nemail: ${email}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <header className="text-center mb-10">
          <p className="text-brand-dark text-xs tracking-[0.3em] mb-2">
            COOKIE 熊本
          </p>
          <h1 className="text-3xl font-bold text-ink mb-2">ログイン</h1>
          <p className="text-sm text-ink-muted">
            アカウント情報を入力してください
          </p>
        </header>

        <button
          type="button"
          onClick={handleLineLogin}
          className="w-full flex items-center justify-center gap-3 bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold rounded-xl py-4 px-6 transition shadow-sm"
        >
          <span className="inline-flex items-center justify-center w-6 h-6 bg-white/20 rounded text-xs font-bold">
            LINE
          </span>
          <span className="text-base">LINEでログイン</span>
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-brand-light/60" />
          <span className="text-xs text-ink-muted">または</span>
          <div className="flex-1 h-px bg-brand-light/60" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-ink mb-2">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@cookie-kmt.com"
              className="w-full bg-white border border-brand-light/60 rounded-xl px-4 py-3 text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-brand transition"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm text-ink mb-2">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              className="w-full bg-white border border-brand-light/60 rounded-xl px-4 py-3 text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-brand transition"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-ink hover:bg-ink/90 text-white font-semibold rounded-xl py-4 transition shadow-sm"
          >
            ログイン
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button
            type="button"
            className="text-sm text-brand-dark hover:underline"
          >
            パスワードを忘れた方はこちら
          </button>
          <p className="text-xs text-ink-muted">
            アカウントは管理者が作成します
          </p>
        </div>

        <footer className="mt-12 text-center text-xs text-ink-muted">
          © 2026 COOKIE 熊本 / cookie-kmt
        </footer>
      </div>
    </main>
  );
}
