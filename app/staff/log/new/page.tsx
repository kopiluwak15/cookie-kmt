"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MENUS } from "@/lib/menus";

// ===== ダミーデータ =====
const STAFF = { name: "黒田 真菜武" };

// チェックイン済みのお客様のみ（LINE QR経由）
const CHECKED_IN_CUSTOMERS = [
  { id: 1, name: "佐藤 由美",   visits: 5,  checkedInAt: "10:02" },
  { id: 2, name: "田中 美咲",   visits: 3,  checkedInAt: "11:28" },
  { id: 3, name: "鈴木 さくら", visits: 12, checkedInAt: "12:55" },
  { id: 4, name: "高橋 麻衣",   visits: 1,  checkedInAt: "14:30" },
];

const RISK_LEVELS = [
  { id: "low",  label: "低", cls: "bg-green-100 text-green-800 border-green-400" },
  { id: "mid",  label: "中", cls: "bg-amber-100 text-amber-800 border-amber-400" },
  { id: "high", label: "高", cls: "bg-red-100 text-red-800 border-red-400" },
];

const SYMPTOM_CHIPS    = ["クセ強", "うねり", "広がり", "ダメージ", "毛先パサつき", "ボリューム不足"];
const LIFE_CHIPS       = ["朝のスタイリング困難", "湿気で広がる", "まとまり悪い"];
const GOAL_CHIPS       = ["朝ラクに", "ツヤ感", "自然な仕上がり", "持続性"];
const NEXT_ACTION_CHIPS = ["1ヶ月後メンテ", "2ヶ月後 C&T", "3ヶ月後再施術", "経過観察"];

type Step = "customer" | "menu" | "judgment" | "confirm";

// ===== メイン =====
export default function StaffTreatmentEntry() {
  const [step, setStep] = useState<Step>("customer");
  const [customer, setCustomer] = useState<typeof CHECKED_IN_CUSTOMERS[number] | null>(null);
  const [selectedMenus, setSelectedMenus] = useState<number[]>([]);

  // 判断ログ
  const [symptoms, setSymptoms]       = useState<string[]>([]);
  const [lifeImpact, setLifeImpact]   = useState<string[]>([]);
  const [goal, setGoal]               = useState<string[]>([]);
  const [risk, setRisk]               = useState<string | null>(null);
  const [nextAction, setNextAction]   = useState<string | null>(null);
  const [memo, setMemo]               = useState("");

  const total = selectedMenus.reduce((sum, id) => {
    const m = MENUS.find((m) => m.id === id);
    return sum + (m?.price ?? 0);
  }, 0);

  const conceptCount = selectedMenus.filter(
    (id) => MENUS.find((m) => m.id === id)?.concept,
  ).length;
  const hasConcept = conceptCount > 0;

  const toggleMenu = (id: number) => {
    setSelectedMenus((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleChip = (
    list: string[],
    setList: (v: string[]) => void,
    item: string,
  ) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const goNext = () => {
    if (step === "customer") setStep("menu");
    else if (step === "menu") setStep(hasConcept ? "judgment" : "confirm");
    else if (step === "judgment") setStep("confirm");
  };
  const goBack = () => {
    if (step === "confirm") setStep(hasConcept ? "judgment" : "menu");
    else if (step === "judgment") setStep("menu");
    else if (step === "menu") setStep("customer");
  };

  const canNext = (() => {
    if (step === "customer") return !!customer;
    if (step === "menu") return selectedMenus.length > 0;
    return true;
  })();

  // ステップインジケーター用
  const allSteps: { key: Step; label: string }[] = [
    { key: "customer", label: "お客様" },
    { key: "menu",     label: "メニュー" },
    ...(hasConcept ? ([{ key: "judgment" as Step, label: "判断ログ" }]) : []),
    { key: "confirm",  label: "確認" },
  ];
  const currentIdx = allSteps.findIndex((s) => s.key === step);

  return (
    <main className="min-h-screen bg-canvas pb-32">
      {/* ヘッダー */}
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/staff/home" className="text-xs text-ink-muted">
            ← ホーム
          </Link>
          <p className="text-sm font-bold text-ink">施術ログ入力</p>
          <span className="text-[10px] text-ink-muted">{STAFF.name}</span>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1">
            {allSteps.map((s, i) => (
              <div key={s.key} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full h-1 rounded-full ${
                    i <= currentIdx ? "bg-brand" : "bg-brand-light/40"
                  }`}
                />
                <span
                  className={`text-[10px] mt-1 ${
                    i === currentIdx
                      ? "text-brand-dark font-bold"
                      : "text-ink-muted"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        {/* ====== Step 1: チェックイン済み顧客選択 ====== */}
        {step === "customer" && (
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base font-bold text-ink">本日のチェックイン</h2>
              <span className="text-xs text-ink-muted">
                {CHECKED_IN_CUSTOMERS.length}名
              </span>
            </div>
            {CHECKED_IN_CUSTOMERS.length === 0 ? (
              <div className="bg-white border border-brand-light/60 rounded-2xl p-8 text-center">
                <p className="text-sm text-ink-muted">
                  チェックイン中のお客様はいません
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {CHECKED_IN_CUSTOMERS.map((c) => {
                  const active = customer?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCustomer(c)}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition active:scale-[0.99] ${
                        active
                          ? "border-brand bg-brand/5"
                          : "border-brand-light/60 bg-white"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-brand/10 text-brand-dark flex items-center justify-center font-bold text-lg">
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-base font-bold text-ink truncate">
                          {c.name}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          {c.visits}回目 / {c.checkedInAt} チェックイン
                        </p>
                      </div>
                      {active && <span className="text-brand text-2xl">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ====== Step 2: メニュー選択（金額注意） ====== */}
        {step === "menu" && (
          <section>
            <h2 className="text-base font-bold text-ink mb-1">メニューを選択</h2>
            <p className="text-[11px] text-ink-muted mb-3">
              {customer?.name} 様 / 複数選択可
            </p>

            {/* ⚠ 注意バナー */}
            <div className="mb-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none">⚠️</span>
                <div className="text-[12px] text-amber-900 leading-snug">
                  <p className="font-bold mb-0.5">会計金額と一致させてください</p>
                  <p>レジでの実会計と1円も違わないよう確認してから保存してください。</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {MENUS.map((m) => {
                const active = selectedMenus.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMenu(m.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition active:scale-[0.99] ${
                      active
                        ? "border-brand bg-brand/5"
                        : "border-brand-light/60 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                          active
                            ? "bg-brand border-brand text-white"
                            : "border-brand-light"
                        }`}
                      >
                        {active ? "✓" : ""}
                      </span>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">
                          {m.name}
                        </p>
                        {m.concept && (
                          <span className="inline-block text-[9px] mt-0.5 px-1.5 py-0.5 rounded bg-brand/10 text-brand-dark border border-brand/30">
                            コンセプト
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-brand-dark shrink-0">
                      ¥{m.price.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ====== Step 3: 判断ログ（コンセプト時のみ） ====== */}
        {step === "judgment" && (
          <section>
            <div className="mb-3 rounded-xl border-2 border-brand/40 bg-brand/5 p-3">
              <p className="text-[12px] text-brand-dark leading-snug">
                <span className="font-bold">📋 判断ログ</span>{" "}
                — コンセプトメニュー{conceptCount}件のためインセンティブ対象です。
              </p>
            </div>

            <ChipGroup
              title="主な症状（S）"
              chips={SYMPTOM_CHIPS}
              selected={symptoms}
              onToggle={(c) => toggleChip(symptoms, setSymptoms, c)}
            />
            <ChipGroup
              title="生活への影響（L）"
              chips={LIFE_CHIPS}
              selected={lifeImpact}
              onToggle={(c) => toggleChip(lifeImpact, setLifeImpact, c)}
            />
            <ChipGroup
              title="成功条件（G）"
              chips={GOAL_CHIPS}
              selected={goal}
              onToggle={(c) => toggleChip(goal, setGoal, c)}
            />

            <p className="text-xs font-semibold text-ink-muted mb-2 mt-5">
              リスク評価
            </p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {RISK_LEVELS.map((r) => {
                const active = risk === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRisk(active ? null : r.id)}
                    className={`py-4 rounded-xl border-2 font-bold text-base transition active:scale-[0.97] ${
                      active
                        ? r.cls + " border-current"
                        : "bg-white border-brand-light/60 text-ink"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-semibold text-ink-muted mb-2">次回アクション</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {NEXT_ACTION_CHIPS.map((a) => {
                const active = nextAction === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setNextAction(active ? null : a)}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition active:scale-[0.97] ${
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-brand-light/60 bg-white text-ink"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-semibold text-ink-muted mb-2">申し送り</p>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="次回への引き継ぎ事項"
              rows={3}
              className="w-full bg-white border border-brand-light/60 rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-brand"
            />
          </section>
        )}

        {/* ====== Step 4: 確認 ====== */}
        {step === "confirm" && (
          <section>
            <h2 className="text-base font-bold text-ink mb-3">内容を確認</h2>
            <div className="bg-white border border-brand-light/60 rounded-2xl divide-y divide-brand-light/40 mb-4">
              <SummaryRow label="お客様" value={customer?.name ?? "-"} />
              <SummaryRow
                label="メニュー"
                value={
                  selectedMenus.length
                    ? MENUS.filter((m) => selectedMenus.includes(m.id))
                        .map((m) => m.name)
                        .join("\n")
                    : "-"
                }
                multiline
              />
              <SummaryRow
                label="会計金額"
                value={`¥${total.toLocaleString()}`}
                strong
              />
              {hasConcept && (
                <>
                  <SummaryRow
                    label="コンセプト数"
                    value={`${conceptCount}件`}
                  />
                  <SummaryRow
                    label="判断ログ"
                    value={
                      symptoms.length || lifeImpact.length || goal.length || risk || nextAction || memo
                        ? "記録済み"
                        : "未入力"
                    }
                  />
                </>
              )}
            </div>

            {hasConcept && (
              <div className="rounded-xl border-2 border-green-300 bg-green-50 p-3 mb-2">
                <p className="text-[12px] text-green-900 leading-snug">
                  <span className="font-bold">💰 インセンティブ対象</span>{" "}
                  — 判断ログが記録されている場合、月次でカウントされます。
                </p>
              </div>
            )}
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
              <p className="text-[12px] text-amber-900 leading-snug">
                <span className="font-bold">⚠️ 最終確認</span>{" "}
                — 会計金額がレジと一致していますか？
              </p>
            </div>
          </section>
        )}
      </div>

      {/* 下部固定アクションバー */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-brand-light/60 px-4 py-3 z-20">
        {step === "menu" && selectedMenus.length > 0 && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-ink-muted">
              {selectedMenus.length}件
              {hasConcept && (
                <span className="ml-2 text-brand-dark font-bold">
                  コンセプト{conceptCount}
                </span>
              )}
            </span>
            <span className="text-base font-bold text-brand-dark">
              ¥{total.toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex gap-2">
          {step !== "customer" && (
            <button
              type="button"
              onClick={goBack}
              className="flex-1 py-3.5 rounded-xl border border-brand-light/60 bg-white text-sm font-bold text-ink active:bg-canvas transition"
            >
              ← 戻る
            </button>
          )}
          {step !== "confirm" ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={goNext}
              className="flex-[2] py-3.5 rounded-xl bg-brand text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed active:bg-brand-dark transition"
            >
              次へ →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => alert("保存しました（ダミー）")}
              className="flex-[2] py-3.5 rounded-xl bg-green-600 text-white text-sm font-bold active:bg-green-700 transition"
            >
              ✓ 保存
            </button>
          )}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </main>
  );
}

// ===== 部品 =====
function ChipGroup({
  title,
  chips,
  selected,
  onToggle,
}: {
  title: string;
  chips: string[];
  selected: string[];
  onToggle: (chip: string) => void;
}) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-ink-muted mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => {
          const active = selected.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => onToggle(c)}
              className={`px-3 py-2 rounded-full text-xs font-semibold border-2 transition ${
                active
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-ink border-brand-light/60"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
  multiline = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <span className="text-xs text-ink-muted shrink-0 pt-0.5">{label}</span>
      <span
        className={`text-right text-sm ${
          strong ? "font-bold text-brand-dark text-base" : "text-ink"
        } ${multiline ? "whitespace-pre-line" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
