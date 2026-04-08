"use client";

import { useEffect, useMemo, useState } from "react";
import { MENUS, CATEGORY_LABEL, type MenuCategory } from "@/lib/menus";

// ===== 選択肢マスタ =====
const VISIT_ROUTES = [
  "ホットペッパー",
  "紹介",
  "Instagram",
  "看板",
  "Google",
  "その他",
];

const HISTORY_OPTIONS = ["黒染め", "ブリーチ", "縮毛矯正", "その他"];

const TODAYS_WISH_OPTIONS = [
  "縮毛矯正",
  "髪質改善",
  "メンテナンス",
  "カット",
  "パーマ",
  "カラー",
  "トリートメント",
  "その他",
];

const OCCUPATION_OPTIONS = [
  "会社員",
  "自営業",
  "パート・アルバイト",
  "学生",
  "主婦",
  "その他",
];

const ADDRESS_OPTIONS = [
  "熊本市中央区",
  "熊本市東区",
  "熊本市西区",
  "熊本市南区",
  "熊本市北区",
  "熊本県内",
  "熊本県外",
  "その他",
];

const HAIR_WORRIES = [
  "スタイリングが決まらない",
  "トップにボリュームがほしい",
  "ボリュームを抑えたい",
  "白髪が気になる",
  "髪が伸びるとまとまらない",
  "似合う髪型がわからない",
];

const SALON_REASONS = [
  "口コミがよかった",
  "縮毛矯正に強そう",
  "髪質改善が気になった",
  "雰囲気がよさそう",
  "通いやすい",
  "スタッフの雰囲気",
];

const STAY_STYLES = [
  "楽しく過ごしたい",
  "静かに過ごしたい",
  "雑誌を読みたい",
  "その他",
];

const DISLIKES = [
  "強引なメニュー提案",
  "話しかけられすぎ",
  "シャンプーが痛い",
  "待ち時間が長い",
  "仕上がりイメージが伝わらない",
];

// ===== 頭部イラストの「気になる箇所」 =====
type HeadSpot = {
  id: string;
  label: string;
  view: "front" | "back";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

const HEAD_SPOTS: HeadSpot[] = [
  // 正面
  { id: "f-top",       label: "トップ",     view: "front", cx: 100, cy: 35,  rx: 38, ry: 16 },
  { id: "f-bangs",     label: "前髪",       view: "front", cx: 100, cy: 70,  rx: 32, ry: 14 },
  { id: "f-side-l",    label: "サイド左",   view: "front", cx: 50,  cy: 75,  rx: 18, ry: 22 },
  { id: "f-side-r",    label: "サイド右",   view: "front", cx: 150, cy: 75,  rx: 18, ry: 22 },
  { id: "f-face-l",    label: "顔周り左",   view: "front", cx: 55,  cy: 115, rx: 16, ry: 14 },
  { id: "f-face-r",    label: "顔周り右",   view: "front", cx: 145, cy: 115, rx: 16, ry: 14 },
  { id: "f-sideburn",  label: "もみあげ",   view: "front", cx: 100, cy: 150, rx: 32, ry: 12 },
  // 後方
  { id: "b-top",       label: "トップ",     view: "back", cx: 100, cy: 35,  rx: 38, ry: 16 },
  { id: "b-side-l",    label: "サイド左",   view: "back", cx: 50,  cy: 80,  rx: 18, ry: 22 },
  { id: "b-side-r",    label: "サイド右",   view: "back", cx: 150, cy: 80,  rx: 18, ry: 22 },
  { id: "b-back",      label: "後頭部",     view: "back", cx: 100, cy: 90,  rx: 36, ry: 24 },
  { id: "b-nape",      label: "襟足",       view: "back", cx: 100, cy: 145, rx: 30, ry: 12 },
];

// ===== 型 =====
type FormState = {
  name: string;
  furigana: string;
  birthday: string;
  phone: string;
  address: string;
  occupation: string;
  gender: "" | "female" | "male" | "other";
  visitRoute: string;
  todaysWish: string[];
  history: string[];
  worries: string[];
  worriesOther: string;
  reasons: string[];
  reasonsOther: string;
  stayStyle: string;
  stayStyleOther: string;
  dislikes: string[];
  dislikesOther: string;
  spots: string[];
  selectedMenus: number[];
};

const TOTAL_STEPS = 9;

// ===== メイン =====
export default function CustomerRegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    name: "",
    furigana: "",
    birthday: "",
    phone: "",
    address: "",
    occupation: "",
    gender: "",
    visitRoute: "",
    todaysWish: [],
    history: [],
    worries: [],
    worriesOther: "",
    reasons: [],
    reasonsOther: "",
    stayStyle: "",
    stayStyleOther: "",
    dislikes: [],
    dislikesOther: "",
    spots: [],
    selectedMenus: [],
  });
  const [submitted, setSubmitted] = useState<"none" | "regular" | "concept">("none");

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const toggleArr = <K extends keyof FormState>(key: K, item: string) => {
    const arr = (form[key] as unknown as string[]) ?? [];
    update(
      key,
      (arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]) as any,
    );
  };

  const conceptCount = form.selectedMenus.filter(
    (id) => MENUS.find((m) => m.id === id)?.concept,
  ).length;
  const total = form.selectedMenus.reduce(
    (s, id) => s + (MENUS.find((m) => m.id === id)?.price ?? 0),
    0,
  );

  // バリデーション
  const canNext = (() => {
    switch (step) {
      case 1:
        return (
          form.name.trim() &&
          form.furigana.trim() &&
          form.birthday &&
          form.phone.trim() &&
          form.gender
        );
      case 2: return !!form.visitRoute && form.todaysWish.length > 0;
      case 3: return true; // 任意
      case 4: return form.worries.length > 0 || form.worriesOther.trim();
      case 5: return true;
      case 6: return !!form.stayStyle;
      case 7: return true;
      case 8: return form.spots.length > 0;
      case 9: return form.selectedMenus.length > 0;
      default: return true;
    }
  })();

  const handleSubmit = () => {
    // TODO: API送信（カルテ保存）
    setSubmitted(conceptCount > 0 ? "concept" : "regular");
  };

  // ===== 完了画面 =====
  if (submitted !== "none") {
    return <CompletionScreen variant={submitted} />;
  }

  return (
    <main className="min-h-screen bg-canvas pb-32">
      {/* ヘッダー（進捗バー） */}
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-[10px] tracking-[0.3em] text-brand-dark">
            COOKIE 熊本
          </p>
          <p className="text-xs font-bold text-ink">カルテ作成</p>
          <p className="text-[11px] text-ink-muted">{step} / {TOTAL_STEPS}</p>
        </div>
        <div className="flex gap-1 px-4 pb-3">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full ${
                i < step ? "bg-brand" : "bg-brand-light/40"
              }`}
            />
          ))}
        </div>
      </header>

      <div className="px-4 py-5 max-w-xl mx-auto">
        {/* === Step 1: 基本情報 === */}
        {step === 1 && (
          <Section title="基本情報" sub="お客様の基本情報を入力してください">
            <Field label="お名前" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="山田 花子"
                className="input"
              />
            </Field>
            <Field label="フリガナ" required>
              <input
                type="text"
                value={form.furigana}
                onChange={(e) => update("furigana", e.target.value)}
                placeholder="ヤマダ ハナコ"
                className="input"
              />
            </Field>
            <Field label="生年月日" required>
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => update("birthday", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="電話番号" required>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="090-0000-0000"
                className="input"
              />
            </Field>
            <Field label="ご住所">
              <select
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className="input"
              >
                <option value="">選択してください</option>
                {ADDRESS_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="ご職業">
              <select
                value={form.occupation}
                onChange={(e) => update("occupation", e.target.value)}
                className="input"
              >
                <option value="">選択してください</option>
                {OCCUPATION_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="性別" required>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "female", label: "女性" },
                  { id: "male",   label: "男性" },
                  { id: "other",  label: "その他" },
                ].map((g) => {
                  const active = form.gender === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => update("gender", g.id as any)}
                      className={`py-3 rounded-xl border-2 text-sm font-semibold transition ${
                        active
                          ? "bg-brand text-white border-brand"
                          : "bg-white border-brand-light/60 text-ink"
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>
        )}

        {/* === Step 2: ご来店について === */}
        {step === 2 && (
          <Section title="ご来店について" sub="きっかけ・ご希望を教えてください">
            <Field label="ご来店のきっかけ" required>
              <RadioList
                options={VISIT_ROUTES}
                value={form.visitRoute}
                onChange={(v) => update("visitRoute", v)}
              />
            </Field>
            <Field label="本日のご希望" required>
              <ChipMulti
                options={TODAYS_WISH_OPTIONS}
                selected={form.todaysWish}
                onToggle={(v) => toggleArr("todaysWish", v)}
              />
            </Field>
          </Section>
        )}

        {/* === Step 3: 施術履歴 === */}
        {step === 3 && (
          <Section
            title="前回・前々回の施術履歴"
            sub="該当するものをすべてお選びください（任意）"
          >
            <ChipMulti
              options={HISTORY_OPTIONS}
              selected={form.history}
              onToggle={(v) => toggleArr("history", v)}
            />
          </Section>
        )}

        {/* === Step 4: 髪のお悩み === */}
        {step === 4 && (
          <Section
            title="髪の毛で気になる点・お悩み"
            sub="当てはまるものをすべて選んでください（必須）"
          >
            <ChipMulti
              options={HAIR_WORRIES}
              selected={form.worries}
              onToggle={(v) => toggleArr("worries", v)}
            />
            <Field label="その他（自由記入）">
              <textarea
                rows={3}
                value={form.worriesOther}
                onChange={(e) => update("worriesOther", e.target.value)}
                className="input"
                placeholder="例: 朝のうねりが気になる"
              />
            </Field>
          </Section>
        )}

        {/* === Step 5: 当サロンを選んだ理由 === */}
        {step === 5 && (
          <Section
            title="当サロンを選んだ理由・求めること"
            sub="当てはまるものをお選びください"
          >
            <ChipMulti
              options={SALON_REASONS}
              selected={form.reasons}
              onToggle={(v) => toggleArr("reasons", v)}
            />
            <Field label="その他（自由記入）">
              <textarea
                rows={3}
                value={form.reasonsOther}
                onChange={(e) => update("reasonsOther", e.target.value)}
                className="input"
              />
            </Field>
          </Section>
        )}

        {/* === Step 6: 過ごし方 === */}
        {step === 6 && (
          <Section
            title="お店での過ごし方"
            sub="ご希望の過ごし方を教えてください（必須）"
          >
            <RadioList
              options={STAY_STYLES}
              value={form.stayStyle}
              onChange={(v) => update("stayStyle", v)}
            />
            {form.stayStyle === "その他" && (
              <Field label="自由記入">
                <input
                  type="text"
                  value={form.stayStyleOther}
                  onChange={(e) => update("stayStyleOther", e.target.value)}
                  className="input"
                />
              </Field>
            )}
          </Section>
        )}

        {/* === Step 7: 苦手だったこと === */}
        {step === 7 && (
          <Section
            title="美容室で苦手・嫌だったこと"
            sub="教えていただけると配慮します（任意）"
          >
            <ChipMulti
              options={DISLIKES}
              selected={form.dislikes}
              onToggle={(v) => toggleArr("dislikes", v)}
            />
            <Field label="その他（自由記入）">
              <textarea
                rows={3}
                value={form.dislikesOther}
                onChange={(e) => update("dislikesOther", e.target.value)}
                className="input"
              />
            </Field>
          </Section>
        )}

        {/* === Step 8: 気になる箇所（頭部イラスト） === */}
        {step === 8 && (
          <Section
            title="気になる箇所"
            sub="頭部イラストをタップしてください（複数選択OK・必須）"
          >
            <div className="rounded-xl bg-canvas border border-brand-light/60 px-3 py-2 text-center mb-4">
              <p className="text-xs text-ink-muted">
                気になる箇所を全てタップしてください
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <HeadIllustration
                view="front"
                label="正面"
                spots={HEAD_SPOTS.filter((s) => s.view === "front")}
                selected={form.spots}
                onToggle={(id) => toggleArr("spots", id)}
              />
              <HeadIllustration
                view="back"
                label="後方"
                spots={HEAD_SPOTS.filter((s) => s.view === "back")}
                selected={form.spots}
                onToggle={(id) => toggleArr("spots", id)}
              />
            </div>
            {form.spots.length > 0 && (
              <p className="text-xs text-brand-dark text-center mt-3 font-bold">
                {form.spots.length}箇所を選択中
              </p>
            )}
          </Section>
        )}

        {/* === Step 9: 今日の目的（メニュー選択） === */}
        {step === 9 && (
          <Section
            title="今日の目的"
            sub="ご希望のメニューをお選びください（必須・複数可）"
          >
            <MenuPicker
              selected={form.selectedMenus}
              onToggle={(id) =>
                update(
                  "selectedMenus",
                  form.selectedMenus.includes(id)
                    ? form.selectedMenus.filter((x) => x !== id)
                    : [...form.selectedMenus, id],
                )
              }
            />
          </Section>
        )}
      </div>

      {/* 下部固定アクション */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-brand-light/60 px-4 py-3 z-20">
        {step === 9 && form.selectedMenus.length > 0 && (
          <div className="max-w-xl mx-auto flex items-center justify-between mb-2">
            <span className="text-[11px] text-ink-muted">
              {form.selectedMenus.length}件選択
            </span>
            <span className="text-base font-bold text-brand-dark">
              ¥{total.toLocaleString()}
            </span>
          </div>
        )}
        <div className="max-w-xl mx-auto flex gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3.5 rounded-xl border border-brand-light/60 bg-white text-sm font-bold text-ink"
            >
              ← 戻る
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="flex-[2] py-3.5 rounded-xl bg-brand text-white text-sm font-bold disabled:opacity-40"
            >
              次へ →
            </button>
          ) : (
            <button
              type="button"
              disabled={!canNext}
              onClick={handleSubmit}
              className="flex-[2] py-3.5 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-40"
            >
              ✓ 送信する
            </button>
          )}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      {/* input style 共通 */}
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
    </main>
  );
}

// ===== 部品 =====
function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h1 className="text-xl font-bold text-ink mb-1">{title}</h1>
      {sub && <p className="text-xs text-ink-muted mb-5">{sub}</p>}
      <div className="space-y-4">{children}</div>
    </section>
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
      <label className="block text-xs font-semibold text-ink-muted mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function RadioList({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-semibold transition ${
              active
                ? "border-brand bg-brand/5 text-ink"
                : "border-brand-light/60 bg-white text-ink"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${
                  active ? "border-brand" : "border-brand-light"
                }`}
              >
                {active && <span className="w-2.5 h-2.5 rounded-full bg-brand" />}
              </span>
              {o}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ChipMulti({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold border-2 transition ${
              active
                ? "bg-brand text-white border-brand"
                : "bg-white text-ink border-brand-light/60"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function HeadIllustration({
  view,
  label,
  spots,
  selected,
  onToggle,
}: {
  view: "front" | "back";
  label: string;
  spots: HeadSpot[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-brand-light/60 p-3">
      <p className="text-center text-xs font-bold text-ink mb-1">{label}</p>
      <svg viewBox="0 0 200 180" className="w-full">
        {/* 頭部輪郭 */}
        <ellipse
          cx="100"
          cy="90"
          rx="78"
          ry="82"
          fill="#FAF8F5"
          stroke="#C9B79C"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        {/* スポット */}
        {spots.map((s) => {
          const active = selected.includes(s.id);
          return (
            <g
              key={s.id}
              onClick={() => onToggle(s.id)}
              style={{ cursor: "pointer" }}
            >
              <ellipse
                cx={s.cx}
                cy={s.cy}
                rx={s.rx}
                ry={s.ry}
                fill={active ? "#9E7B5B" : "rgba(201,183,156,0.25)"}
                stroke={active ? "#6B5239" : "#C9B79C"}
                strokeWidth={active ? 2 : 1}
              />
              <text
                x={s.cx}
                y={s.cy + 3}
                textAnchor="middle"
                fontSize="9"
                fill={active ? "#fff" : "#7A736D"}
                fontWeight={active ? "bold" : "normal"}
                pointerEvents="none"
              >
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MenuPicker({
  selected,
  onToggle,
}: {
  selected: number[];
  onToggle: (id: number) => void;
}) {
  const [tab, setTab] = useState<MenuCategory>("straight");
  const tabs: MenuCategory[] = useMemo(
    () => Array.from(new Set(MENUS.map((m) => m.category))),
    [],
  );
  const filtered = MENUS.filter((m) => m.category === tab);

  return (
    <div>
      {/* タブ */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${
              tab === t
                ? "bg-brand text-white border-brand"
                : "bg-white text-ink border-brand-light/60"
            }`}
          >
            {CATEGORY_LABEL[t]}
          </button>
        ))}
      </div>
      {/* 商品グリッド */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {filtered.map((m) => {
          const active = selected.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onToggle(m.id)}
              className={`p-3 rounded-xl border-2 text-left transition ${
                active
                  ? "bg-brand/5 border-brand"
                  : "bg-white border-brand-light/60"
              }`}
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <p className="text-[11px] font-bold text-ink leading-tight flex-1">
                  {m.name}
                </p>
                {active && <span className="text-brand text-sm">✓</span>}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-brand-dark font-bold">
                  ¥{m.price.toLocaleString()}
                </span>
                {m.concept && (
                  <span className="text-[8px] px-1 py-0.5 rounded bg-brand/10 text-brand-dark border border-brand/30">
                    コンセプト
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompletionScreen({ variant }: { variant: "regular" | "concept" }) {
  // コンセプト時は3秒後に /liff/concept へ自動遷移
  useEffect(() => {
    if (variant !== "concept") return;
    const t = setTimeout(() => {
      window.location.href = "/liff/concept";
    }, 3000);
    return () => clearTimeout(t);
  }, [variant]);

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-5 flex items-center justify-center">
          <span className="text-3xl text-green-700">✓</span>
        </div>
        <h1 className="text-lg font-bold text-ink mb-4 leading-relaxed">
          カルテの記入が
          <br />
          完了しました
        </h1>
        <p className="text-sm text-ink-muted leading-loose mb-3">
          COOKIEでは
          <br />
          髪を切ることを第一に考えていません。
          <br />
          いろいろな方法で
          <br />
          お客様の悩みに寄り添えるように
          <br />
          心がけております。
        </p>
        <p className="text-base font-bold text-ink leading-relaxed">
          本日はよろしくお願いします。
        </p>
        {variant === "concept" ? (
          <p className="text-[11px] text-ink-muted mt-5">
            次の画面へ移動します...
          </p>
        ) : (
          <p className="text-[11px] text-ink-muted mt-5">
            スタッフがお声がけするまで
            <br />
            少々お待ちください。
          </p>
        )}
      </div>
    </main>
  );
}
