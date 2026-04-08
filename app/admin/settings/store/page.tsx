"use client";

import { useState } from "react";

export default function StoreSettingsPage() {
  const [form, setForm] = useState({
    name: "COOKIE 熊本",
    nameKana: "クッキー クマモト",
    postalCode: "860-0000",
    address: "熊本県熊本市中央区○○町1-2-3 COOKIEビル 2F",
    phone: "096-000-0000",
    email: "info@cookie.hair",
    businessHours: "10:00 - 20:00",
    holidays: "毎週火曜日",
    parkingInfo: "提携駐車場あり（3時間無料）",
  });
  const [saved, setSaved] = useState(false);

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-3xl mx-auto pl-16 lg:pl-6">
          <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
            COOKIE 熊本 / ADMIN / 設定
          </p>
          <h1 className="text-lg font-bold text-ink">店舗情報</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-6">
        <form
          onSubmit={submit}
          className="bg-white rounded-2xl border border-brand-light/60 p-6 space-y-5"
        >
          <Field label="店舗名" value={form.name} onChange={(v) => update("name", v)} />
          <Field
            label="店舗名（カナ）"
            value={form.nameKana}
            onChange={(v) => update("nameKana", v)}
          />
          <Field
            label="郵便番号"
            value={form.postalCode}
            onChange={(v) => update("postalCode", v)}
          />
          <Field
            label="住所"
            value={form.address}
            onChange={(v) => update("address", v)}
          />
          <Field
            label="電話番号"
            value={form.phone}
            onChange={(v) => update("phone", v)}
          />
          <Field
            label="メールアドレス"
            value={form.email}
            onChange={(v) => update("email", v)}
          />
          <Field
            label="営業時間"
            value={form.businessHours}
            onChange={(v) => update("businessHours", v)}
          />
          <Field
            label="定休日"
            value={form.holidays}
            onChange={(v) => update("holidays", v)}
          />
          <Field
            label="駐車場情報"
            value={form.parkingInfo}
            onChange={(v) => update("parkingInfo", v)}
          />

          <div className="pt-4 border-t border-brand-light/40 flex items-center justify-between gap-3">
            {saved && (
              <p className="text-xs font-bold text-green-600">✓ 保存しました</p>
            )}
            <button
              type="submit"
              className="ml-auto px-5 py-2.5 rounded-xl bg-ink text-white text-sm font-bold active:bg-ink-muted transition"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-ink mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-canvas border border-brand-light/60 rounded-xl px-4 py-3 text-sm text-ink outline-none focus:border-brand-dark"
      />
    </div>
  );
}
