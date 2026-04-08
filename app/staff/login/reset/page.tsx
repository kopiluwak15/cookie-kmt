"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StaffPasswordResetPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-canvas" />}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const email = params.get("email") ?? "";
  const isFirst = params.get("first") === "1";

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules = {
    length: pw1.length >= 8,
    hasNumber: /\d/.test(pw1),
    hasLetter: /[a-zA-Z]/.test(pw1),
    notInitial: pw1 !== "123456",
  };
  const allOk = Object.values(rules).every(Boolean);
  const match = pw1.length > 0 && pw1 === pw2;
  const canSubmit = allOk && match && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    const { error: updErr } = await supabase.auth.updateUser({ password: pw1 });
    if (updErr) {
      setError(updErr.message);
      setSubmitting(false);
      return;
    }

    // password_initialized フラグを立てる（自分のレコードのみ更新可能）
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("staff")
        .update({ password_initialized: true })
        .eq("auth_user_id", user.id);
    }

    router.push("/staff");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.4em] text-brand-dark mb-1">
            COOKIE 熊本
          </p>
          <h1 className="text-2xl font-bold text-ink">
            {isFirst ? "初回パスワード設定" : "パスワード変更"}
          </h1>
          {isFirst && (
            <p className="text-xs text-ink-muted mt-2 leading-relaxed">
              セキュリティのため、初期パスワードから
              <br />
              ご自身のパスワードに変更してください
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-brand-light/60 p-6 shadow-sm">
          {email && (
            <div className="mb-4 px-3 py-2 rounded-xl bg-canvas border border-brand-light/40">
              <p className="text-[10px] text-ink-muted mb-0.5">ログイン中</p>
              <p className="text-xs font-bold text-ink truncate">{email}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-2">
                新しいパスワード
              </label>
              <input
                type="password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                placeholder="新しいパスワード"
                autoComplete="new-password"
                className="w-full bg-white border border-brand-light/60 rounded-xl px-4 py-3 text-sm text-ink outline-none focus:border-brand-dark"
              />
              <ul className="mt-2 space-y-1">
                <Rule ok={rules.length}>8文字以上</Rule>
                <Rule ok={rules.hasLetter}>英字を含む</Rule>
                <Rule ok={rules.hasNumber}>数字を含む</Rule>
                <Rule ok={rules.notInitial}>初期パスワードと異なる</Rule>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-2">
                新しいパスワード（確認）
              </label>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="もう一度入力"
                autoComplete="new-password"
                className="w-full bg-white border border-brand-light/60 rounded-xl px-4 py-3 text-sm text-ink outline-none focus:border-brand-dark"
              />
              {pw2.length > 0 && !match && (
                <p className="text-[11px] text-red-600 mt-1.5">
                  パスワードが一致しません
                </p>
              )}
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
              {submitting ? "設定中..." : "パスワードを設定"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`flex items-center gap-1.5 text-[11px] ${
        ok ? "text-green-600" : "text-ink-muted"
      }`}
    >
      <span>{ok ? "✓" : "○"}</span>
      <span>{children}</span>
    </li>
  );
}
