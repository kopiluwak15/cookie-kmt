"use client";

import { useEffect, useState } from "react";
import {
  PERMISSIONS,
  STAGES,
  STORES,
  type Permission,
  type StageCode,
} from "@/lib/admin-mock";

type FormState = {
  name: string;
  email: string;
  password: string;
  permission: Permission;
  stage: StageCode | "";
  storeId: string;
};

const INITIAL: FormState = {
  name: "",
  email: "",
  password: "",
  permission: "staff",
  stage: "",
  storeId: "",
};

export default function StaffNewModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);

  // モーダル表示時にbodyスクロールを止める
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // ESCで閉じる
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.password.length >= 6 &&
    form.stage;

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    // TODO: POST /api/staff
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    setForm(INITIAL);
    onClose();
    // TODO: 一覧をrefreshで再取得
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-new-title"
    >
      {/* 背景 */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      {/* モーダル本体 */}
      <div className="relative bg-white rounded-2xl w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto shadow-2xl">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-brand-light/40 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2
            id="staff-new-title"
            className="text-base font-bold text-ink"
          >
            新規スタッフ登録
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="w-8 h-8 rounded-full hover:bg-canvas flex items-center justify-center text-ink-muted text-lg"
          >
            ✕
          </button>
        </div>

        {/* フォーム */}
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
              placeholder="6文字以上"
              minLength={6}
              className="input"
            />
          </Field>

          <Field label="権限" required>
            <select
              value={form.permission}
              onChange={(e) => update("permission", e.target.value as Permission)}
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
              onChange={(e) => update("stage", e.target.value as StageCode)}
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

          <Field label="所属店舗">
            <select
              value={form.storeId}
              onChange={(e) => update("storeId", e.target.value)}
              className="input"
            >
              <option value="">未割り当て</option>
              {STORES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-white border-t border-brand-light/40 px-6 py-4 flex items-center justify-end gap-2 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-brand-light/60 bg-white text-sm font-bold text-ink hover:bg-canvas transition"
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={!canSubmit || submitting}
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
