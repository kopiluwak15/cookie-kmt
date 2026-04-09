'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'

// ===== 選択肢マスタ =====
const VISIT_ROUTES = [
  'ホットペッパー',
  '紹介',
  'Instagram',
  '看板',
  'Google',
  'その他',
]

const HISTORY_OPTIONS = ['黒染め', 'ブリーチ', '縮毛矯正', 'その他']

const OCCUPATION_OPTIONS = [
  '会社員',
  '自営業',
  'パート・アルバイト',
  '学生',
  '主婦',
  'その他',
]

const ADDRESS_OPTIONS = [
  '熊本市中央区',
  '熊本市東区',
  '熊本市西区',
  '熊本市南区',
  '熊本市北区',
  '熊本県内',
  '熊本県外',
  'その他',
]

const HAIR_WORRIES = [
  '相談したい',
  'おまかせ',
  'スタイリングが決まらない',
  'トップにボリュームがほしい',
  'ボリュームを抑えたい',
  '白髪が気になる',
  '髪が伸びるとまとまらない',
  '似合う髪型がわからない',
]

const SALON_REASONS = [
  '口コミがよかった',
  '縮毛矯正に強そう',
  '髪質改善が気になった',
  '雰囲気がよさそう',
  '通いやすい',
  'スタッフの雰囲気',
]

const STAY_STYLES = [
  '楽しく過ごしたい',
  '静かに過ごしたい',
  '雑誌を読みたい',
  'その他',
]

const DISLIKES = [
  '強引なメニュー提案',
  '話しかけられすぎ',
  'シャンプーが痛い',
  '待ち時間が長い',
  '仕上がりイメージが伝わらない',
]

// ===== 頭部イラストの「気になる箇所」 =====
type HeadSpot = {
  id: string
  label: string
  view: 'front' | 'back'
  cx: number
  cy: number
  rx: number
  ry: number
}

const HEAD_SPOTS: HeadSpot[] = [
  { id: 'f-top', label: 'トップ', view: 'front', cx: 100, cy: 35, rx: 38, ry: 16 },
  { id: 'f-bangs', label: '前髪', view: 'front', cx: 100, cy: 70, rx: 32, ry: 14 },
  { id: 'f-side-l', label: 'サイド左', view: 'front', cx: 50, cy: 75, rx: 18, ry: 22 },
  { id: 'f-side-r', label: 'サイド右', view: 'front', cx: 150, cy: 75, rx: 18, ry: 22 },
  { id: 'f-face-l', label: '顔周り左', view: 'front', cx: 55, cy: 115, rx: 16, ry: 14 },
  { id: 'f-face-r', label: '顔周り右', view: 'front', cx: 145, cy: 115, rx: 16, ry: 14 },
  { id: 'f-sideburn', label: 'もみあげ', view: 'front', cx: 100, cy: 150, rx: 32, ry: 12 },
  { id: 'b-top', label: 'トップ', view: 'back', cx: 100, cy: 35, rx: 38, ry: 16 },
  { id: 'b-side-l', label: 'サイド左', view: 'back', cx: 50, cy: 80, rx: 18, ry: 22 },
  { id: 'b-side-r', label: 'サイド右', view: 'back', cx: 150, cy: 80, rx: 18, ry: 22 },
  { id: 'b-back', label: '後頭部', view: 'back', cx: 100, cy: 90, rx: 36, ry: 24 },
  { id: 'b-nape', label: '襟足', view: 'back', cx: 100, cy: 145, rx: 30, ry: 12 },
]

type FormState = {
  name: string
  furigana: string
  birthday: string
  phone: string
  address: string
  occupation: string
  gender: '' | 'female' | 'male' | 'other'
  visitRoute: string
  history: string[]
  worries: string[]
  worriesOther: string
  reasons: string[]
  reasonsOther: string
  stayStyle: string
  stayStyleOther: string
  dislikes: string[]
  dislikesOther: string
  spots: string[]
  selectedMenus: string[]
}

// 0: welcome (intro), 1-12: content steps
const TOTAL_STEPS = 12

const STORAGE_KEY = 'liff_register_draft_v1'

const EMPTY_FORM: FormState = {
  name: '',
  furigana: '',
  birthday: '',
  phone: '',
  address: '',
  occupation: '',
  gender: '',
  visitRoute: '',
  history: [],
  worries: [],
  worriesOther: '',
  reasons: [],
  reasonsOther: '',
  stayStyle: '',
  stayStyleOther: '',
  dislikes: [],
  dislikesOther: '',
  spots: [],
  selectedMenus: [],
}

function loadDraft(): { form: FormState; step: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { form?: Partial<FormState>; step?: number }
    return {
      form: { ...EMPTY_FORM, ...(parsed.form || {}) },
      step: typeof parsed.step === 'number' ? parsed.step : 0,
    }
  } catch {
    return null
  }
}

export default function LiffRegisterPage() {
  return (
    <Suspense
      fallback={
        <main
          className="bg-stone-50 flex items-center justify-center"
          style={{ minHeight: '100dvh' }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </main>
      }
    >
      <LiffRegisterInner />
    </Suspense>
  )
}

function LiffRegisterInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // ドラフトから初期化（SSRでは null → hydrate 後に復元）
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<'none' | 'regular' | 'concept'>('none')
  const [error, setError] = useState<string | null>(null)
  const [lineUserId, setLineUserId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [hydrated, setHydrated] = useState(false)

  // 初回マウント時にドラフト復元
  useEffect(() => {
    const draft = loadDraft()
    if (draft) {
      setForm(draft.form)
      setStep(draft.step)
    }
    setHydrated(true)
  }, [])

  // LINE userId & 表示名 取得（URLクエリ優先、なければsessionStorageフォールバック）
  useEffect(() => {
    const qLid = searchParams?.get('lid')
    const qDn = searchParams?.get('dn')
    const lid = qLid || sessionStorage.getItem('liff_line_user_id')
    const dn = qDn || sessionStorage.getItem('liff_display_name')
    if (lid) setLineUserId(lid)
    if (dn) setForm((p) => (p.name ? p : { ...p, name: dn }))
  }, [searchParams])

  // ステップ切替時にスクロール位置をリセット
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
  }, [step])

  // form / step が変わるたびにドラフト保存（hydrate 後のみ）
  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ form, step }))
    } catch {
      // quota etc.
    }
  }, [form, step, hydrated])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }))

  const toggleArr = <K extends keyof FormState>(key: K, item: string) => {
    const arr = form[key] as unknown as string[]
    update(
      key,
      (arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]) as FormState[K]
    )
  }

  const canNext = (() => {
    switch (step) {
      case 0:
        return true // welcome
      case 1: // お名前・フリガナ
        return !!(form.name.trim() && form.furigana.trim())
      case 2: // 生年月日・性別
        return !!(form.birthday && form.gender)
      case 3: // 電話番号
        return !!form.phone.trim()
      case 4: // 住所・職業
        return true // 任意
      case 5: // 来店きっかけ
        return !!form.visitRoute
      case 6: // 施術歴
        return true
      case 7: // お悩み
        return form.worries.length > 0 || form.worriesOther.trim().length > 0
      case 8: // 理由
        return true
      case 9: // 過ごし方
        return !!form.stayStyle
      case 10: // 苦手
        return true
      case 11: // 気になる箇所
        return form.spots.length > 0
      case 12: // メニュー
        return form.selectedMenus.length > 0
      default:
        return true
    }
  })()

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/karte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, todaysWish: [], lineUserId }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json.error || '送信に失敗しました')
      }
      if (json.customer?.id) {
        sessionStorage.setItem('liff_customer_id', json.customer.id)
      }
      // 送信成功 → ドラフトを破棄
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {}
      if (json.customer?.isConcept) {
        // コンセプトメニューの場合は、完了画面を挟まずに直接アンケートへ
        const q = new URLSearchParams()
        if (lineUserId) q.set('lid', lineUserId)
        if (json.customer?.id) q.set('cid', json.customer.id)
        router.replace(`/liff/concept?${q.toString()}`)
        return
      }
      setSubmitted('regular')
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信に失敗しました')
      setSubmitting(false)
    }
  }

  // 完了画面
  if (submitted !== 'none') {
    return <CompletionScreen variant={submitted} router={router} />
  }

  // ===== Welcome (step 0) =====
  if (step === 0) {
    return (
      <main
        className="bg-stone-50 overflow-x-hidden flex flex-col"
        style={{
          minHeight: '100dvh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          <div className="w-full max-w-md text-center">
            <p className="text-[10px] tracking-[0.35em] text-stone-500 mb-3">COOKIE 熊本</p>
            <div className="w-10 h-px bg-stone-400 mx-auto mb-8" />
            <h1 className="text-2xl font-bold text-stone-900 mb-6 leading-relaxed">
              ご来店ありがとう
              <br />
              ございます
            </h1>
            <p className="text-sm text-stone-700 leading-loose mb-2">
              はじめてのご来店ですので
              <br />
              カルテを作成させていただきます。
            </p>
            <p className="text-sm text-stone-700 leading-loose mb-10">
              下の「開始する」から
              <br />
              ご入力をお願いいたします。
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-4 rounded-2xl bg-stone-900 text-white text-base font-semibold shadow-sm hover:bg-stone-800 transition"
            >
              開始する
            </button>
            <p className="text-[11px] text-stone-400 mt-6 leading-relaxed">
              所要時間の目安：約3〜5分
            </p>
          </div>
        </div>
      </main>
    )
  }

  // ===== Content steps (1-12) =====
  const nextBtn =
    step < TOTAL_STEPS ? (
      <button
        type="button"
        disabled={!canNext}
        onClick={() => setStep((s) => s + 1)}
        className="shrink-0 px-5 h-11 rounded-2xl bg-stone-900 text-white text-sm font-semibold disabled:opacity-40 transition"
      >
        次へ →
      </button>
    ) : (
      <button
        type="button"
        disabled={!canNext || submitting}
        onClick={handleSubmit}
        className="shrink-0 px-5 h-11 rounded-2xl bg-stone-900 text-white text-sm font-semibold disabled:opacity-40 transition"
      >
        {submitting ? '送信中...' : '送信する'}
      </button>
    )

  return (
    <main
      className="bg-stone-50 overflow-x-hidden flex flex-col w-full"
      style={{ minHeight: '100dvh', maxWidth: '100vw' }}
    >
      {/* ヘッダー */}
      <header className="bg-white border-b border-stone-200 shrink-0">
        <div className="w-full max-w-xl mx-auto px-5 py-3 flex items-center justify-between">
          <p className="text-[10px] tracking-[0.3em] text-stone-500">COOKIE 熊本</p>
          <p className="text-xs font-semibold text-stone-700">カルテ作成</p>
          <p className="text-[11px] text-stone-400 tabular-nums">
            {step} / {TOTAL_STEPS}
          </p>
        </div>
        <div className="w-full max-w-xl mx-auto px-5 pb-3">
          <div className="h-1 rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full bg-stone-900 transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* コンテンツ */}
      <div className="flex-1 w-full max-w-xl mx-auto px-5 py-6">
        {/* Step 1: お名前・フリガナ */}
        {step === 1 && (
          <StepFrame nextBtn={nextBtn} title="お名前を教えてください" sub="ご本名とフリガナをお願いします">
            <Field label="お名前" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="山田 花子"
                className="input"
                autoFocus
              />
            </Field>
            <Field label="フリガナ" required>
              <input
                type="text"
                value={form.furigana}
                onChange={(e) => update('furigana', e.target.value)}
                placeholder="ヤマダ ハナコ"
                className="input"
              />
            </Field>
          </StepFrame>
        )}

        {/* Step 2: 生年月日・性別 */}
        {step === 2 && (
          <StepFrame nextBtn={nextBtn} title="生年月日と性別" sub="スタイル提案の参考にさせていただきます">
            <Field label="生年月日" required>
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => update('birthday', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="性別" required>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'female', label: '女性' },
                  { id: 'male', label: '男性' },
                  { id: 'other', label: 'その他' },
                ].map((g) => {
                  const active = form.gender === g.id
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => update('gender', g.id as FormState['gender'])}
                      className={`py-3.5 rounded-2xl border text-sm font-semibold transition ${
                        active
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white border-stone-200 text-stone-700'
                      }`}
                    >
                      {g.label}
                    </button>
                  )
                })}
              </div>
            </Field>
          </StepFrame>
        )}

        {/* Step 3: 電話番号 */}
        {step === 3 && (
          <StepFrame nextBtn={nextBtn} title="お電話番号" sub="ご連絡に使わせていただきます">
            <Field label="電話番号" required>
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="090-0000-0000"
                className="input"
                autoFocus
              />
            </Field>
          </StepFrame>
        )}

        {/* Step 4: 住所・職業 */}
        {step === 4 && (
          <StepFrame nextBtn={nextBtn} title="お住まい・ご職業" sub="差し支えなければお答えください（任意）">
            <Field label="ご住所">
              <select
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                className="input"
              >
                <option value="">選択してください</option>
                {ADDRESS_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ご職業">
              <select
                value={form.occupation}
                onChange={(e) => update('occupation', e.target.value)}
                className="input"
              >
                <option value="">選択してください</option>
                {OCCUPATION_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
          </StepFrame>
        )}

        {/* Step 5: 来店きっかけ */}
        {step === 5 && (
          <StepFrame nextBtn={nextBtn}
            title="当店をお知りになったきっかけ"
            sub="差し支えなければ教えてください"
          >
            <RadioList
              options={VISIT_ROUTES}
              value={form.visitRoute}
              onChange={(v) => update('visitRoute', v)}
            />
          </StepFrame>
        )}

        {/* Step 6: 施術歴 */}
        {step === 6 && (
          <StepFrame nextBtn={nextBtn}
            title="これまでの施術履歴"
            sub="前回・前々回に受けた施術があればお選びください（任意）"
          >
            <ChipMulti
              options={HISTORY_OPTIONS}
              selected={form.history}
              onToggle={(v) => toggleArr('history', v)}
            />
          </StepFrame>
        )}

        {/* Step 7: お悩み */}
        {step === 7 && (
          <StepFrame nextBtn={nextBtn}
            title="髪で気になっていること"
            sub="あてはまるものをお選びください"
          >
            <ChipMulti
              options={HAIR_WORRIES}
              selected={form.worries}
              onToggle={(v) => toggleArr('worries', v)}
            />
            <div className="mt-4">
              <label className="block text-xs font-semibold text-stone-600 mb-2">
                その他（自由記入）
              </label>
              <textarea
                rows={3}
                value={form.worriesOther}
                onChange={(e) => update('worriesOther', e.target.value)}
                className="input"
                placeholder="例: 朝のうねりが気になる"
              />
            </div>
          </StepFrame>
        )}

        {/* Step 8: 選んだ理由 */}
        {step === 8 && (
          <StepFrame nextBtn={nextBtn}
            title="当サロンを選ばれた理由"
            sub="複数お選びいただけます（任意）"
          >
            <ChipMulti
              options={SALON_REASONS}
              selected={form.reasons}
              onToggle={(v) => toggleArr('reasons', v)}
            />
            <div className="mt-4">
              <label className="block text-xs font-semibold text-stone-600 mb-2">
                その他（自由記入）
              </label>
              <textarea
                rows={3}
                value={form.reasonsOther}
                onChange={(e) => update('reasonsOther', e.target.value)}
                className="input"
              />
            </div>
          </StepFrame>
        )}

        {/* Step 9: 過ごし方 */}
        {step === 9 && (
          <StepFrame nextBtn={nextBtn} title="お店での過ごし方" sub="どのようにお過ごしになりたいですか">
            <RadioList
              options={STAY_STYLES}
              value={form.stayStyle}
              onChange={(v) => update('stayStyle', v)}
            />
            {form.stayStyle === 'その他' && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-stone-600 mb-2">
                  ご希望をお書きください
                </label>
                <input
                  type="text"
                  value={form.stayStyleOther}
                  onChange={(e) => update('stayStyleOther', e.target.value)}
                  className="input"
                />
              </div>
            )}
          </StepFrame>
        )}

        {/* Step 10: 苦手 */}
        {step === 10 && (
          <StepFrame nextBtn={nextBtn}
            title="苦手なこと・お伝えしたいこと"
            sub="事前に教えていただけると配慮いたします（任意）"
          >
            <ChipMulti
              options={DISLIKES}
              selected={form.dislikes}
              onToggle={(v) => toggleArr('dislikes', v)}
            />
            <div className="mt-4">
              <label className="block text-xs font-semibold text-stone-600 mb-2">
                その他（自由記入）
              </label>
              <textarea
                rows={3}
                value={form.dislikesOther}
                onChange={(e) => update('dislikesOther', e.target.value)}
                className="input"
              />
            </div>
          </StepFrame>
        )}

        {/* Step 11: 気になる箇所 */}
        {step === 11 && (
          <StepFrame nextBtn={nextBtn}
            title="髪で気になる箇所"
            sub="イラストをタップしてお選びください"
          >
            <div className="grid grid-cols-2 gap-3">
              <HeadIllustration
                view="front"
                label="正面"
                spots={HEAD_SPOTS.filter((s) => s.view === 'front')}
                selected={form.spots}
                onToggle={(id) => toggleArr('spots', id)}
              />
              <HeadIllustration
                view="back"
                label="後方"
                spots={HEAD_SPOTS.filter((s) => s.view === 'back')}
                selected={form.spots}
                onToggle={(id) => toggleArr('spots', id)}
              />
            </div>
            {form.spots.length > 0 && (
              <p className="text-xs text-stone-700 text-center mt-4 font-semibold">
                {form.spots.length}箇所を選択中
              </p>
            )}
          </StepFrame>
        )}

        {/* Step 12: メニュー */}
        {step === 12 && (
          <StepFrame nextBtn={nextBtn}
            title="今日のご希望メニュー"
            sub="気になるカテゴリーをお選びください（複数可）"
          >
            <CategoryPicker
              selected={form.selectedMenus}
              onToggle={(key) =>
                update(
                  'selectedMenus',
                  form.selectedMenus.includes(key)
                    ? form.selectedMenus.filter((x) => x !== key)
                    : [...form.selectedMenus, key]
                )
              }
            />
            {form.selectedMenus.includes('kaizen') && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-xs font-semibold text-amber-800">
                  髪質改善 / 縮毛矯正 を選択中
                </p>
                <p className="text-[11px] text-amber-700/80 mt-1 leading-relaxed">
                  送信後、詳細アンケートにご回答いただきます
                </p>
              </div>
            )}
          </StepFrame>
        )}
      </div>

      {/* 下部：戻るボタンのみ */}
      <div
        className="shrink-0 bg-white border-t border-stone-200 px-5 py-3 sticky bottom-0 z-20"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div className="w-full max-w-xl mx-auto">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="w-full py-3 rounded-2xl border border-stone-200 bg-white text-sm font-semibold text-stone-700"
          >
            ← 戻る
          </button>
          {error && (
            <p className="text-center text-xs text-red-600 font-semibold mt-2">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* input style 共通 */}
      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: #fff;
          border: 1px solid #e7e5e4;
          border-radius: 14px;
          padding: 14px 16px;
          font-size: 15px;
          color: #1c1917;
          outline: none;
          transition: border-color 0.15s;
        }
        :global(.input:focus) {
          border-color: #1c1917;
        }
      `}</style>
    </main>
  )
}

// ===== 部品 =====
function StepFrame({
  title,
  sub,
  nextBtn,
  children,
}: {
  title: string
  sub?: string
  nextBtn?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h1 className="text-xl font-bold text-stone-900 leading-snug flex-1 min-w-0">
          {title}
        </h1>
        {nextBtn}
      </div>
      {sub && <p className="text-xs text-stone-500 mb-6 leading-relaxed">{sub}</p>}
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function RadioList({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2.5">
      {options.map((o) => {
        const active = value === o
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`w-full text-left px-5 py-4 rounded-2xl border text-sm font-semibold transition ${
              active
                ? 'border-stone-900 bg-stone-100 text-stone-900'
                : 'border-stone-200 bg-white text-stone-700'
            }`}
          >
            <span className="inline-flex items-center gap-3">
              <span
                className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center ${
                  active ? 'border-stone-900' : 'border-stone-300'
                }`}
              >
                {active && <span className="w-2.5 h-2.5 rounded-full bg-stone-900" />}
              </span>
              {o}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ChipMulti({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o)
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold border transition ${
              active
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-700 border-stone-200'
            }`}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

function HeadIllustration({
  view,
  label,
  spots,
  selected,
  onToggle,
}: {
  view: 'front' | 'back'
  label: string
  spots: HeadSpot[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-3">
      <p className="text-center text-xs font-semibold text-stone-700 mb-1">
        {label}（{view === 'front' ? '前' : '後'}）
      </p>
      <svg viewBox="0 0 200 180" className="w-full">
        <ellipse
          cx="100"
          cy="90"
          rx="78"
          ry="82"
          fill="#FAFAF9"
          stroke="#D6D3D1"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        {spots.map((s) => {
          const active = selected.includes(s.id)
          return (
            <g key={s.id} onClick={() => onToggle(s.id)} style={{ cursor: 'pointer' }}>
              <ellipse
                cx={s.cx}
                cy={s.cy}
                rx={s.rx}
                ry={s.ry}
                fill={active ? '#1c1917' : 'rgba(214,211,209,0.3)'}
                stroke={active ? '#000' : '#D6D3D1'}
                strokeWidth={active ? 2 : 1}
              />
              <text
                x={s.cx}
                y={s.cy + 3}
                textAnchor="middle"
                fontSize="9"
                fill={active ? '#fff' : '#78716C'}
                fontWeight={active ? 'bold' : 'normal'}
                pointerEvents="none"
              >
                {s.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ===== CategoryPicker =====
// 具体的な商品やメニューはスタッフが施術ログ時に入力するため、
// カルテ作成時はカテゴリー選択のみに留める
const CATEGORIES: { key: string; title: string; tone: 'amber' | 'neutral' }[] = [
  { key: 'kaizen', title: '髪質改善 / 縮毛矯正', tone: 'amber' },
  { key: 'consult', title: 'ご相談 / おまかせ', tone: 'neutral' },
  { key: 'regular', title: 'ヘアカット / カラー / パーマ / トリートメント', tone: 'neutral' },
  { key: 'care', title: 'メンテナンス / ヘッドスパ / ヘアセット / メイク', tone: 'neutral' },
  { key: 'product', title: '店内商品購入', tone: 'neutral' },
]

function CategoryPicker({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (key: string) => void
}) {
  return (
    <div className="space-y-3">
      {CATEGORIES.map((c) => {
        const active = selected.includes(c.key)
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onToggle(c.key)}
            className={`w-full text-left px-5 py-5 rounded-2xl border-2 transition ${
              active
                ? c.tone === 'amber'
                  ? 'bg-amber-50 border-amber-600'
                  : 'bg-stone-100 border-stone-900'
                : c.tone === 'amber'
                ? 'bg-white border-amber-200'
                : 'bg-white border-stone-200'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-stone-900 leading-snug flex-1">
                {c.title}
              </p>
              {active && (
                <Check
                  className={`h-5 w-5 shrink-0 ${
                    c.tone === 'amber' ? 'text-amber-700' : 'text-stone-900'
                  }`}
                />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function CompletionScreen({
  variant,
  router,
}: {
  variant: 'regular' | 'concept'
  router: ReturnType<typeof useRouter>
}) {
  useEffect(() => {
    if (variant === 'concept') {
      // クエリパラメータ (lid, cid) を引き継いでコンセプトアンケートへ
      const t = setTimeout(() => {
        const url = new URL(window.location.href)
        const lid = url.searchParams.get('lid')
        const cid = sessionStorage.getItem('liff_customer_id')
        const q = new URLSearchParams()
        if (lid) q.set('lid', lid)
        if (cid) q.set('cid', cid)
        router.replace(`/liff/concept?${q.toString()}`)
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [variant, router])

  return (
    <main
      className="bg-stone-50 flex items-center justify-center px-8"
      style={{ minHeight: '100dvh' }}
    >
      <div className="max-w-md text-center w-full">
        <div className="w-20 h-20 rounded-full bg-green-100 mx-auto mb-6 flex items-center justify-center">
          <Check className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-stone-900 mb-5 leading-relaxed">
          カルテの記入が
          <br />
          完了しました
        </h1>
        <p className="text-sm text-stone-700 leading-loose mb-4">
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
        <p className="text-base font-semibold text-stone-900 leading-relaxed mb-8">
          本日はよろしくお願いいたします
        </p>
        {variant === 'concept' ? (
          <p className="text-[11px] text-stone-500">次の画面へ移動します...</p>
        ) : (
          <p className="text-[11px] text-stone-500 leading-relaxed">
            スタッフがお声がけするまで
            <br />
            少々お待ちください
          </p>
        )}
      </div>
    </main>
  )
}
