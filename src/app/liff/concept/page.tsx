'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'

const SYMPTOMS = [
  'うねりがある',
  '広がる・膨らむ',
  'パサつく',
  'ツヤがない',
  'ゴワつく',
  'まとまらない',
  'アイロンを使わないと外に出られない',
  '雨・湿気で崩れる',
  '表面がパヤパヤする',
  'ねじれるクセがある',
  '根元と毛先で状態が違う',
]

const LIFE_IMPACTS = [
  '朝の準備に時間がかかる',
  '外出前に疲れる',
  '天気予報を気にする',
  '人に会う前に気になる',
  '写真に写るのが嫌',
  '髪を結ぶしかない',
  '旅行・出張が不安',
  '美容室に行くたびに説明が大変',
]

const PSYCHOLOGY = [
  '自分の髪が好きではない',
  '諦めている',
  'どうせ良くならないと思っている',
  '比較してしまう',
  '過去に失敗経験がある',
  '美容師にうまく伝えられない',
  '毎回仕上がりが違う',
]

const PAST_EXPERIENCES = [
  '受けたことがない',
  '良かった経験がある',
  '思っていた仕上がりと違った',
  '傷んだ',
  'すぐ戻った',
  '効果を感じなかった',
]

const SUCCESS_CRITERIA = [
  'アイロンを使わなくていい',
  '朝のセット時間が短くなる',
  'ツヤが出る',
  '手触りが良くなる',
  '雨・湿気でも崩れない',
  '自分の髪が扱いやすくなる',
  '1日中まとまる',
]

const PRIORITIES = [
  'とにかく楽さ',
  '見た目のきれいさ',
  'ダメージを抑えること',
  '持ちの良さ',
  'ナチュラルさ',
  '費用を抑えたい',
]

const STEPS = [
  { title: '今のお悩み', sub: '当てはまるものを全て選んでください', multi: true },
  { title: '生活への影響', sub: '髪の悩みが日常にどう影響していますか？', multi: true },
  { title: 'お気持ち', sub: '髪に対して感じていることを教えてください', multi: true },
  { title: '過去の経験', sub: '美容室での施術経験について', multi: true },
  { title: '理想の状態', sub: 'どうなったら嬉しいですか？', multi: true },
  { title: '優先順位', sub: '特に大事なことを選んでください', multi: true },
  { title: '不安なこと', sub: '何でもお書きください（任意）', multi: false },
] as const

export default function ConceptSurveyPage() {
  return (
    <Suspense
      fallback={
        <main
          className="bg-gray-50 flex items-center justify-center"
          style={{ minHeight: '100dvh' }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </main>
      }
    >
      <ConceptSurveyInner />
    </Suspense>
  )
}

const CONCEPT_STORAGE_KEY = 'liff_concept_draft_v1'

type ConceptDraft = {
  step: number
  symptoms: string[]
  symptomsOther: string
  lifeImpacts: string[]
  lifeOther: string
  psychology: string[]
  pastExp: string[]
  successCriteria: string[]
  successFree: string
  priorities: string[]
  worries: string
}

function loadConceptDraft(): ConceptDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CONCEPT_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ConceptDraft
  } catch {
    return null
  }
}

function ConceptSurveyInner() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const [symptoms, setSymptoms] = useState<string[]>([])
  const [symptomsOther, setSymptomsOther] = useState('')
  const [lifeImpacts, setLifeImpacts] = useState<string[]>([])
  const [lifeOther, setLifeOther] = useState('')
  const [psychology, setPsychology] = useState<string[]>([])
  const [pastExp, setPastExp] = useState<string[]>([])
  const [successCriteria, setSuccessCriteria] = useState<string[]>([])
  const [successFree, setSuccessFree] = useState('')
  const [priorities, setPriorities] = useState<string[]>([])
  const [worries, setWorries] = useState('')

  // 初回マウント時にドラフト復元
  useEffect(() => {
    const d = loadConceptDraft()
    if (d) {
      setStep(d.step ?? 0)
      setSymptoms(d.symptoms ?? [])
      setSymptomsOther(d.symptomsOther ?? '')
      setLifeImpacts(d.lifeImpacts ?? [])
      setLifeOther(d.lifeOther ?? '')
      setPsychology(d.psychology ?? [])
      setPastExp(d.pastExp ?? [])
      setSuccessCriteria(d.successCriteria ?? [])
      setSuccessFree(d.successFree ?? '')
      setPriorities(d.priorities ?? [])
      setWorries(d.worries ?? '')
    }
    setHydrated(true)
  }, [])

  // ステップ切替時にスクロール位置をリセット
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
  }, [step])

  // 入力が変わるたびにドラフト保存（hydrate 後のみ）
  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(
        CONCEPT_STORAGE_KEY,
        JSON.stringify({
          step,
          symptoms,
          symptomsOther,
          lifeImpacts,
          lifeOther,
          psychology,
          pastExp,
          successCriteria,
          successFree,
          priorities,
          worries,
        })
      )
    } catch {}
  }, [
    hydrated,
    step,
    symptoms,
    symptomsOther,
    lifeImpacts,
    lifeOther,
    psychology,
    pastExp,
    successCriteria,
    successFree,
    priorities,
    worries,
  ])

  const tog = (arr: string[], set: (v: string[]) => void, v: string) =>
    arr.includes(v) ? set(arr.filter((x) => x !== v)) : set([...arr, v])

  const canNext = (() => {
    switch (step) {
      case 0:
        return symptoms.length > 0
      case 1:
        return lifeImpacts.length > 0
      case 2:
        return psychology.length > 0
      case 3:
        return true
      case 4:
        return successCriteria.length > 0
      case 5:
        return priorities.length > 0
      default:
        return true
    }
  })()

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const lineUserId =
        searchParams?.get('lid') ||
        (typeof window !== 'undefined' ? sessionStorage.getItem('liff_line_user_id') : null)
      const customerId =
        searchParams?.get('cid') ||
        (typeof window !== 'undefined' ? sessionStorage.getItem('liff_customer_id') : null)

      const res = await fetch('/api/karte/concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId,
          customerId,
          symptoms,
          symptomsOther,
          lifeImpacts,
          lifeOther,
          psychology,
          pastExp,
          successCriteria,
          successFree,
          priorities,
          worries,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || '送信に失敗しました')
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信に失敗しました')
      setSubmitting(false)
    }
  }

  if (done) {
    return <ConceptDoneScreen />
  }

  return (
    <main
      className="bg-gray-50 overflow-x-hidden flex flex-col w-full"
      style={{ minHeight: '100dvh', maxWidth: '100vw' }}
    >
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="w-full px-4 py-3 text-center max-w-xl mx-auto">
          <p className="text-[10px] tracking-[0.2em] text-gray-500 mb-0.5">
            HAIR RESTRUCTURE PROGRAM
          </p>
          <p className="text-sm font-bold text-gray-900">お悩み詳細アンケート</p>
        </div>
        <div className="w-full px-4 pb-3 max-w-xl mx-auto">
          <div className="flex gap-1 mb-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  i <= step ? 'bg-gray-900' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] text-gray-500 text-right">
            {step + 1} / {STEPS.length}
          </p>
        </div>
      </header>

      <div className="flex-1 w-full px-4 py-5 max-w-xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-xl font-bold text-gray-900 leading-snug flex-1 min-w-0">
            {STEPS[step].title}
          </h2>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="shrink-0 px-5 h-11 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40"
            >
              次へ →
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="shrink-0 px-5 h-11 rounded-2xl bg-green-600 text-white text-sm font-bold disabled:opacity-40"
            >
              {submitting ? '送信中...' : '送信する'}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-3">{STEPS[step].sub}</p>
        {STEPS[step].multi && (
          <div className="inline-flex items-center gap-1.5 mb-5 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300">
            <span className="text-[11px] font-bold text-amber-800">
              ✓ 複数選択できます
            </span>
            {(() => {
              const counts: Record<number, number> = {
                0: symptoms.length,
                1: lifeImpacts.length,
                2: psychology.length,
                3: pastExp.length,
                4: successCriteria.length,
                5: priorities.length,
              }
              const n = counts[step] ?? 0
              return n > 0 ? (
                <span className="text-[11px] font-bold text-amber-900 tabular-nums">
                  （{n}件選択中）
                </span>
              ) : null
            })()}
          </div>
        )}

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
              className="w-full mt-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
            />
          </div>
        )}

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
              className="w-full mt-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
            />
          </div>
        )}

        {step === 2 && (
          <ChipColumn
            options={PSYCHOLOGY}
            selected={psychology}
            onToggle={(v) => tog(psychology, setPsychology, v)}
          />
        )}

        {step === 3 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">
              過去に髪質改善や縮毛矯正を受けたことがありますか？
            </p>
            <ChipColumn
              options={PAST_EXPERIENCES}
              selected={pastExp}
              onToggle={(v) => tog(pastExp, setPastExp, v)}
            />
          </div>
        )}

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
              placeholder="あなたの言葉で「こうなったら嬉しい」を教えてください"
              rows={3}
              className="w-full mt-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900"
            />
          </div>
        )}

        {step === 5 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">
              特に大事なことを選んでください（複数OK）
            </p>
            <ChipColumn
              options={PRIORITIES}
              selected={priorities}
              onToggle={(v) => tog(priorities, setPriorities, v)}
            />
          </div>
        )}

        {step === 6 && (
          <div>
            <textarea
              value={worries}
              onChange={(e) => setWorries(e.target.value)}
              placeholder="不安に思っていること、過去の失敗体験、スタッフに伝えたいことなどがあればお書きください"
              rows={6}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 leading-relaxed"
            />
            <p className="text-[11px] text-gray-500 mt-2">
              ※ 任意です。書かなくても大丈夫です。
            </p>
          </div>
        )}
      </div>

      {/* 下部：戻るボタンのみ */}
      <div
        className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 sticky bottom-0 z-20"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div className="w-full max-w-xl mx-auto">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="w-full py-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-900 disabled:opacity-40"
          >
            ← 戻る
          </button>
          {error && (
            <p className="text-center text-xs text-red-600 font-bold mt-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

function ConceptDoneScreen() {
  const [phase, setPhase] = useState<'thanks' | 'branding'>('thanks')

  useEffect(() => {
    const t = setTimeout(() => setPhase('branding'), 3500)
    return () => clearTimeout(t)
  }, [])

  if (phase === 'thanks') {
    return (
      <main
        className="bg-gray-50 flex flex-col items-center justify-center px-6 transition-opacity duration-700"
        style={{ minHeight: '100dvh' }}
      >
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 mx-auto mb-5 flex items-center justify-center">
            <Check className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-relaxed">
            ご回答ありがとうございました
          </h1>
          <p className="text-sm text-gray-600 leading-loose">
            いただいた内容をもとに、
            <br />
            最適な施術をご提案いたします。
          </p>
        </div>
      </main>
    )
  }

  // ブランディングメッセージ（画像背景）
  return (
    <main
      className="relative flex items-center justify-center px-8 overflow-hidden animate-fadein"
      style={{
        minHeight: '100dvh',
        backgroundImage:
          "linear-gradient(180deg, rgba(15,15,15,0.65) 0%, rgba(15,15,15,0.85) 100%), url('/richmenu.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="relative z-10 max-w-md text-center text-white">
        <p className="text-[10px] tracking-[0.4em] text-white/70 mb-4">COOKIE 熊本</p>
        <div className="w-10 h-px bg-white/60 mx-auto mb-8" />
        <h1 className="text-xl font-bold leading-loose mb-6">
          髪を切ることを
          <br />
          第一に考えていません
        </h1>
        <p className="text-[13px] text-white/85 leading-loose mb-8">
          いろいろな方法で
          <br />
          お客様のお悩みに寄り添えるように
          <br />
          心がけております。
        </p>
        <p className="text-sm font-semibold leading-relaxed">
          本日はよろしく
          <br />
          お願いいたします
        </p>
        <p className="text-[11px] text-white/60 mt-10 leading-relaxed">
          スタッフがお声がけするまで
          <br />
          ごゆっくりおくつろぎください
        </p>
      </div>
      <style jsx>{`
        @keyframes fadein {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadein {
          animation: fadein 0.8s ease-out;
        }
      `}</style>
    </main>
  )
}

function ChipColumn({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => {
        const active = selected.includes(o)
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition flex items-center gap-3 ${
              active
                ? 'border-gray-900 bg-gray-50 text-gray-900'
                : 'border-gray-200 bg-white text-gray-900'
            }`}
          >
            <span
              className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                active
                  ? 'bg-gray-900 border-gray-900'
                  : 'bg-white border-gray-300'
              }`}
              aria-hidden="true"
            >
              {active && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </span>
            <span className="flex-1">{o}</span>
          </button>
        )
      })}
    </div>
  )
}
