"use client";

import { useState } from "react";

type NotifySetting = {
  id: string;
  category: "customer" | "staff" | "admin";
  label: string;
  description: string;
  channels: {
    line: boolean;
    email: boolean;
    push: boolean;
  };
};

const DEFAULT_SETTINGS: NotifySetting[] = [
  // 顧客向け
  {
    id: "bbd_line",
    category: "customer",
    label: "BBD LINE（賞味期限リマインド）",
    description: "ヘアスタイルの期限が近づいたら次回来店を提案",
    channels: { line: true, email: false, push: false },
  },
  {
    id: "booking_confirm",
    category: "customer",
    label: "予約確定通知",
    description: "予約完了時に送信",
    channels: { line: true, email: true, push: false },
  },
  {
    id: "staff_comment",
    category: "customer",
    label: "スタッフコメント受信",
    description: "スタッフからコメントが届いたとき",
    channels: { line: true, email: false, push: true },
  },
  {
    id: "ticket_issued",
    category: "customer",
    label: "チケット発行",
    description: "新しいチケットが発行されたとき",
    channels: { line: true, email: false, push: false },
  },
  // スタッフ向け
  {
    id: "schedule_change",
    category: "staff",
    label: "シフト変更通知",
    description: "シフトが更新されたとき",
    channels: { line: true, email: false, push: true },
  },
  {
    id: "customer_message",
    category: "staff",
    label: "顧客メッセージ受信",
    description: "担当顧客からメッセージが届いたとき",
    channels: { line: true, email: false, push: true },
  },
  // 管理者向け
  {
    id: "daily_report",
    category: "admin",
    label: "日次レポート",
    description: "毎日19時に売上・KPIをサマリー送信",
    channels: { line: false, email: true, push: false },
  },
  {
    id: "alerts",
    category: "admin",
    label: "アラート通知",
    description: "北極星KPI未達や離脱懸念顧客の検知",
    channels: { line: true, email: true, push: false },
  },
];

const CATEGORY_LABEL = {
  customer: "顧客向け",
  staff: "スタッフ向け",
  admin: "管理者向け",
};

export default function NotifySettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  const toggle = (
    id: string,
    channel: "line" | "email" | "push",
  ) => {
    setSettings((s) =>
      s.map((x) =>
        x.id === id
          ? { ...x, channels: { ...x.channels, [channel]: !x.channels[channel] } }
          : x,
      ),
    );
  };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const categories: ("customer" | "staff" | "admin")[] = [
    "customer",
    "staff",
    "admin",
  ];

  return (
    <main className="min-h-screen bg-canvas pb-16">
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-6 py-4 max-w-3xl mx-auto pl-16 lg:pl-6">
          <p className="text-[10px] tracking-[0.3em] text-brand-dark mb-0.5">
            COOKIE 熊本 / ADMIN / 設定
          </p>
          <h1 className="text-lg font-bold text-ink">通知設定</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {categories.map((cat) => (
          <section key={cat}>
            <h2 className="text-[10px] tracking-wider font-bold text-ink-muted mb-2 px-1">
              {CATEGORY_LABEL[cat].toUpperCase()}
            </h2>
            <div className="bg-white rounded-2xl border border-brand-light/60 divide-y divide-brand-light/40 overflow-hidden">
              {settings
                .filter((s) => s.category === cat)
                .map((s) => (
                  <div key={s.id} className="p-4">
                    <p className="text-sm font-bold text-ink mb-0.5">
                      {s.label}
                    </p>
                    <p className="text-[11px] text-ink-muted mb-3 leading-relaxed">
                      {s.description}
                    </p>
                    <div className="flex gap-2">
                      <ChannelToggle
                        active={s.channels.line}
                        label="LINE"
                        onClick={() => toggle(s.id, "line")}
                      />
                      <ChannelToggle
                        active={s.channels.email}
                        label="メール"
                        onClick={() => toggle(s.id, "email")}
                      />
                      <ChannelToggle
                        active={s.channels.push}
                        label="Push"
                        onClick={() => toggle(s.id, "push")}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))}

        {/* LINE連携情報 */}
        <section className="bg-white rounded-2xl border border-brand-light/60 p-5">
          <h2 className="text-sm font-bold text-ink mb-3">LINE公式アカウント</h2>
          <div className="space-y-2">
            <Row label="チャネル名" value="COOKIE 熊本 公式" />
            <Row label="チャネルID" value="19xxxx5678" />
            <Row label="送信状態" value="✓ 有効" valueColor="text-green-600" />
          </div>
          <button
            type="button"
            className="w-full mt-4 py-2.5 rounded-xl border border-brand-light/60 text-xs font-bold text-ink active:bg-canvas transition"
          >
            LINE設定を再認証
          </button>
        </section>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <p className="text-xs font-bold text-green-600">✓ 保存しました</p>
          )}
          <button
            type="button"
            onClick={save}
            className="px-5 py-2.5 rounded-xl bg-ink text-white text-sm font-bold active:bg-ink-muted transition"
          >
            保存
          </button>
        </div>
      </div>
    </main>
  );
}

function ChannelToggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
        active
          ? "bg-brand text-white border-brand"
          : "bg-white text-ink-muted border-brand-light/60"
      }`}
    >
      {active ? "✓ " : ""}
      {label}
    </button>
  );
}

function Row({
  label,
  value,
  valueColor = "text-ink",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[11px] text-ink-muted">{label}</p>
      <p className={`text-xs font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
