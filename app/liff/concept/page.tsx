"use client";

import { useState } from "react";

// ===== 質問マスタ（旧 hair-app/questionnaire/concept より移植） =====

const SYMPTOMS = [
  "うねりがある",
  "広がる・膨らむ",
  "パサつく",
  "ツヤがない",
  "ゴワつく",
  "まとまらない",
  "アイロンを使わないと外に出られない",
  "雨・湿気で崩れる",
  "表面がパヤパヤする",
  "ねじれるクセがある",
  "根元と毛先で状態が違う",
];

const LIFE_IMPACTS = [
  "朝の準備に時間がかかる",
  "外出前に疲れる",
  "天気予報を気にする",
  "人に会う前に気になる",
  "写真に写るのが嫌",
  "髪を結ぶしかない",
  "旅行・出張が不安",
  "美容室に行くたびに説明が大変",
];

const PSYCHOLOGY = [
  "自分の髪が好きではない",
  "諦めている",
  "どうせ良くならないと思っている",
  "比較してしまう",
  "過去に失敗経験がある",
  "美容師にうまく伝えられない",
  "毎回仕上がりが違う",
];

const PAST_EXPERIENCES = [
  "受けたことがない",
  "良かった経験がある",
  "思っていた仕上がりと違った",
  "傷んだ",
  "すぐ戻った",
  "効果を感じなかった",
];

const SUCCESS_CRITERIA = [
  "アイロンを使わなくていい",
  "朝のセット時間が短くなる",
  "ツヤが出る",
  "手触りが良くなる",
  "雨・湿気でも崩れない",
  "自分の髪が扱いやすくなる",
  "1日中まとまる",
];

const PRIORITIES = [
  "とにかく楽さ",
  "見た目のきれいさ",
  "ダメージを抑えること",
  "持ちの良さ",
  "ナチュラルさ",
  "費用を抑えたい",
];

const STEPS = [
  { title: "今のお悩み",   sub: "当てはまるものを全て選んでください" },
  { title: "生活への影響", sub: "髪の悩みが日常にどう影響していますか？" },
  { title: "お気持ち",     sub: "髪に対して感じていることを教えてください" },
  { title: "過去の経験",   sub: "美容室での施術経験について" },
  { title: "理想の状態",   sub: "どうなったら嬉しいですか？" },
  { title: "優先順位",     sub: "特に大事なことを選んでください" },
  { title: "不安なこと",   sub: "何でもお書きください（任意）" },
] as const;

// ===== メイン =====
export default function ConceptSurveyPage() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const [symptoms,        setSymptoms]        = useState<string[]>([]);
  const [symptomsOther,   setSymptomsOther]   = useState("");
  const [lifeImpacts,     setLifeImpacts]     = useState<string[]>([]);
  const [lifeOther,       setLifeOther]       = useState("");
  const [psychology,      setPsychology]      = useState<string[]>([]);
  const [pastExp,         setPastExp]         = useState<string[]>([]);
  const [successCriteria, setSuccessCriteria] = useState<string[]>([]);
  const [successFree,     setSuccessFree]     = useState("");
  const [priorities,      setPriorities]      = useState<string[]>([]);
  const [worries,         setWorries]         = useState("");

  const tog = (arr: string[], set: (v: string[]) => void, v: string) =>
    arr.includes(v) ? set(arr.filter((x) => x !== v)) : set([...arr, v]);

  const canNext = (() => {
    switch (step) {
      case 0: return symptoms.length > 0;
      case 1: return lifeImpacts.length > 0;
      case 2: return psychology.length > 0;
      case 3: return true;
      case 4: return successCriteria.length > 0;
      case 5: return priorities.length > 0;
      default: return true;
    }
  })();

  const submit = () => {
    // TODO: API送信
    console.log({
      symptoms, symptomsOther, lifeImpacts, lifeOther,
      psychology, pastExp, successCriteria, successFree,
      priorities, worries,
    });
    setDone(true);
  };

  if (done) {
    return (
      <main className="min-h-screen bg-canvas flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 mx-auto mb-5 flex items-center justify-center">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-ink mb-3 leading-relaxed">
            ご回答ありがとうございました
          </h1>
          <p className="text-sm text-ink-muted leading-loose mb-4">
            いただいた内容をもとに、
            <br />
            最適な施術をご提案いたします。
          </p>
          <p className="text-xs text-ink-muted/80 leading-loose">
            施術後にLINEでメンテナンスチケットを
            <br />
            お届けします。
            <br />
            ごゆっくりおくつろぎください。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas pb-32">
      {/* ヘッダー */}
      <header className="bg-white border-b border-brand-light/40 sticky top-0 z-10">
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] tracking-[0.2em] text-brand-dark mb-0.5">
            HAIR RESTRUCTURE PROGRAM
          </p>
          <p className="text-sm font-bold text-ink">お悩み詳細アンケート</p>
        </div>
        <div className="px-4 pb-3">
          <div className="flex gap-1 mb-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full ${
                  i <= step ? "bg-brand" : "bg-brand-light/40"
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] text-ink-muted text-right">
            {step + 1} / {STEPS.length}
          </p>
        </div>
      </header>

      <div className="px-4 py-5 max-w-xl mx-auto">
        <h2 className="text-xl font-bold text-ink mb-1">{STEPS[step].title}</h2>
        <p className="text-xs text-ink-muted mb-5">{STEPS[step].sub}</p>

        {/* Step 0: 症状 */}
        {step === 0 && (
          <div className="space-y-2">
            <ChipColumn
              options={SYMPTOMS}
              selected={symptoms}
              onToggle={(v) => tog(symptoms, setSymptoms, v)}
            />
            <textarea
              value={symptomsOther}
              onChange={(e) => setSymptomsOther(e.target.value)}
              placeholder="その他（自由記述）"
              rows={2}
              className="w-full mt-2 bg-white border border-brand-light/60 rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-brand"
            />
          </div>
        )}

        {/* Step 1: 生活への影響 */}
        {step === 1 && (
          <div className="space-y-2">
            <ChipColumn
              options={LIFE_IMPACTS}
              selected={lifeImpacts}
              onToggle={(v) => tog(lifeImpacts, setLifeImpacts, v)}
            />
            <textarea
              value={lifeOther}
              onChange={(e) => setLifeOther(e.target.value)}
              placeholder="その他（自由記述）"
              rows={2}
              className="w-full mt-2 bg-white border border-brand-light/60 rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-brand"
            />
          </div>
        )}

        {/* Step 2: 心理 */}
        {step === 2 && (
          <ChipColumn
            options={PSYCHOLOGY}
            selected={psychology}
            onToggle={(v) => tog(psychology, setPsychology, v)}
          />
        )}

        {/* Step 3: 過去の経験 */}
        {step === 3 && (
          <div>
            <p className="text-xs text-ink-muted mb-2">
              過去に髪質改善や縮毛矯正を受けたことがありますか？
            </p>
            <ChipColumn
              options={PAST_EXPERIENCES}
              selected={pastExp}
              onToggle={(v) => tog(pastExp, setPastExp, v)}
            />
          </div>
        )}

        {/* Step 4: 理想の状態 */}
        {step === 4 && (
          <div className="space-y-2">
            <ChipColumn
              options={SUCCESS_CRITERIA}
              selected={successCriteria}
              onToggle={(v) => tog(successCriteria, setSuccessCriteria, v)}
            />
            <textarea
              value={successFree}
              onChange={(e) => setSuccessFree(e.target.value)}
              placeholder='あなたの言葉で「こうなったら嬉しい」を教えてください'
              rows={3}
              className="w-full mt-2 bg-white border border-brand-light/60 rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-brand"
            />
          </div>
        )}

        {/* Step 5: 優先順位 */}
        {step === 5 && (
          <div>
            <p className="text-xs text-ink-muted mb-2">
              特に大事なことを選んでください（複数OK）
            </p>
            <ChipColumn
              options={PRIORITIES}
              selected={priorities}
              onToggle={(v) => tog(priorities, setPriorities, v)}
            />
          </div>
        )}

        {/* Step 6: 不安なこと */}
        {step === 6 && (
          <div>
            <textarea
              value={worries}
              onChange={(e) => setWorries(e.target.value)}
              placeholder="不安に思っていること、過去の失敗体験、スタッフに伝えたいことなどがあればお書きください"
              rows={6}
              className="w-full bg-white border border-brand-light/60 rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-brand leading-relaxed"
            />
            <p className="text-[11px] text-ink-muted mt-2">
              ※ 任意です。書かなくても大丈夫です。
            </p>
          </div>
        )}
      </div>

      {/* 下部固定アクション */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-brand-light/60 px-4 py-3 z-20">
        <div className="max-w-xl mx-auto flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3.5 rounded-xl border border-brand-light/60 bg-white text-sm font-bold text-ink"
            >
              ← 戻る
            </button>
          )}
          {step < STEPS.length - 1 ? (
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
              onClick={submit}
              className="flex-[2] py-3.5 rounded-xl bg-green-600 text-white text-sm font-bold"
            >
              ✓ 回答を送信する
            </button>
          )}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </main>
  );
}

function ChipColumn({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition ${
              active
                ? "border-brand bg-brand/5 text-ink"
                : "border-brand-light/60 bg-white text-ink"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
