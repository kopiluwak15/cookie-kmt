"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PERMISSIONS,
  STAGES,
  type Permission,
  type StageCode,
} from "@/lib/admin-mock";

type FormState = {
  name: string;
  email: string;
  password: string;
  permission: Permission;
  stage: StageCode | "";
  joinedAt: string;
};

const INITIAL: FormState = {
  name: "",
  email: "",
  password: "",
  permission: "staff",
  stage: "",
  joinedAt: "",
};

export default function StaffNewModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    if (submitting) return;
    setOpen(false);
    setError(null);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.password.length >= 6 &&
    form.stage &&
    !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.permission,
          stage: form.stage || null,
          joined_at: form.joinedAt || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          json.detail || json.error || "登録に失敗しました",
        );
        setSubmitting(false);
        return;
      }
      setForm(INITIAL);
      setSubmitting(false);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ネットワークエラー");
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-bold active:bg-brand-dark transition"
      >
        ＋ 新規登録
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-new-title"
        >
          <div onClick={close} className="absolute inset-0 bg-black/50" />

          <div className="relative bg-white rounded-2xl w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-brand-light/40 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2
                id="staff-new-title"
                className="text-base font-bold text-ink"
              >
                新規スタッフ登録
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="閉じる"
                className="w-8 h-8 rounded-full hover:bg-canvas flex items-center justify-center text-ink-muted text-lg"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <Field label="氏名" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="山田 太郎"
                  className="input"
                />
              </Field>

              <Field label="メールアドレス" required>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="staff@cookie.hair"
                  className="input"
                />
              </Field>

              <Field label="初期パスワード" required>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="6文字以上（初回ログイン時に変更を促します）"
                  minLength={6}
                  className="input"
                />
              </Field>

              <Field label="権限" required>
                <select
                  value={form.permission}
                  onChange={(e) =>
                    update("permission", e.target.value as Permission)
                  }
                  className="input"
                >
                  {PERMISSIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="ステージ" required>
                <select
                  value={form.stage}
                  onChange={(e) =>
                    update("stage", e.target.value as StageCode)
                  }
                  className="input"
                >
                  <option value="">選択してください</option>
                  {STAGES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code}：{s.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="入社日">
                <input
                  type="date"
                  value={form.joinedAt}
                  onChange={(e) => update("joinedAt", e.target.value)}
                  className="input"
                />
              </Field>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-brand-light/40 px-6 py-4 flex items-center justify-end gap-2 rounded-b-2xl">
              <button
                type="button"
                onClick={close}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl border border-brand-light/60 bg-white text-sm font-bold text-ink hover:bg-canvas transition disabled:opacity-40"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={submit}
                className="px-5 py-2.5 rounded-xl bg-ink text-white text-sm font-bold disabled:opacity-40 hover:bg-ink-muted transition"
              >
                {submitting ? "登録中..." : "登録する"}
              </button>
            </div>
          </div>

          <style jsx>{`
            :global(.input) {
              width: 100%;
              background: #fff;
              border: 1px solid rgba(201, 183, 156, 0.6);
              border-radius: 12px;
              padding: 12px 16px;
              font-size: 14px;
              color: #2a2522;
              outline: none;
            }
            :global(.input:focus) {
              border-color: #9e7b5b;
            }
          `}</style>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-ink mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
