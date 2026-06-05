'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Lock,
  AlertTriangle,
} from 'lucide-react'
import {
  getKioskStaffList,
  tabletPunch,
  countTabletPunchesThisMonth,
  TABLET_REASON_PRESETS,
  type KioskStaffItem,
  type ReasonPresetKey,
} from '@/actions/timecard-kiosk'

type Step = 'list' | 'pin' | 'reason' | 'submitting' | 'success' | 'error'

export default function KioskPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">読み込み中...</div>}>
      <KioskInner />
    </Suspense>
  )
}

function KioskInner() {
  const params = useSearchParams()
  const storeId = params?.get('store') || null

  const [staff, setStaff] = useState<KioskStaffItem[]>([])
  const [storeName, setStoreName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('list')

  const [selected, setSelected] = useState<KioskStaffItem | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [reasonPreset, setReasonPreset] = useState<ReasonPresetKey | ''>('')
  const [reasonText, setReasonText] = useState('')
  const [monthCount, setMonthCount] = useState<number | null>(null)

  const [successTime, setSuccessTime] = useState('')
  const [successAction, setSuccessAction] = useState<'check_in' | 'check_out' | null>(null)
  const [countdown, setCountdown] = useState(3)

  // 初回ロード
  useEffect(() => {
    void loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  async function loadList() {
    setLoading(true)
    setError(null)
    const res = await getKioskStaffList(storeId)
    setLoading(false)
    if (!res.ok) {
      setError(res.error || '取得に失敗しました')
      return
    }
    setStaff(res.staff || [])
    setStoreName(res.storeName || null)
  }

  // 3秒カウントダウンで一覧に戻る
  useEffect(() => {
    if (step !== 'success') return
    if (countdown <= 0) {
      resetToList()
      return
    }
    const t = setTimeout(() => setCountdown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [step, countdown])

  function resetToList() {
    setSelected(null)
    setPin('')
    setPinError('')
    setReasonPreset('')
    setReasonText('')
    setMonthCount(null)
    setSuccessTime('')
    setSuccessAction(null)
    setCountdown(3)
    setStep('list')
    void loadList()
  }

  async function handleSelectStaff(s: KioskStaffItem) {
    if (s.next_action === 'done') return
    if (!s.has_pin) {
      setError(
        `${s.name} さんはタブレット打刻PINが未設定です。\nマイページから「タブレット打刻PIN」を登録してください。`
      )
      return
    }
    setSelected(s)
    setPin('')
    setPinError('')
    setStep('pin')
    // 今月の利用回数を非同期取得（指導用）
    void countTabletPunchesThisMonth(s.id).then(setMonthCount)
  }

  function handlePinSubmit() {
    if (!/^[a-zA-Z0-9]{4,8}$/.test(pin)) {
      setPinError('PINは4〜8文字の英数字です')
      return
    }
    setPinError('')
    setStep('reason')
  }

  async function handlePunchSubmit() {
    if (!selected || !reasonPreset) return
    if (reasonPreset === 'other' && !reasonText.trim()) {
      setError('「その他」を選択した場合は理由を記入してください')
      return
    }
    setStep('submitting')
    const res = await tabletPunch({
      staffId: selected.id,
      pin,
      action: selected.next_action as 'check_in' | 'check_out',
      reasonPreset,
      reasonText: reasonText.trim() || undefined,
    })
    if (!res.ok) {
      setError(res.error || '打刻に失敗しました')
      setStep('error')
      return
    }
    setSuccessTime(formatTime(res.time!))
    setSuccessAction(selected.next_action as 'check_in' | 'check_out')
    setCountdown(3)
    setStep('success')
  }

  // ========== レンダリング ==========
  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-100 to-white">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-stone-700" />
            <div>
              <h1 className="text-sm font-bold text-stone-900">タブレット打刻</h1>
              <p className="text-[10px] text-stone-500">
                応急処置用 / {storeName || '全スタッフ'}
              </p>
            </div>
          </div>
          {step === 'list' && (
            <button
              onClick={loadList}
              disabled={loading}
              className="text-xs text-stone-600 inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-stone-300 bg-white"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              更新
            </button>
          )}
          {step !== 'list' && step !== 'success' && (
            <button
              onClick={resetToList}
              className="text-xs text-stone-600 inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-stone-300 bg-white"
            >
              <ArrowLeft className="h-3 w-3" />
              一覧に戻る
            </button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-6">
        {/* グローバルエラー */}
        {error && step === 'list' && (
          <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-red-700 whitespace-pre-line">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-[10px] text-red-600 underline mt-1"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* スタッフ一覧 */}
        {step === 'list' && (
          <>
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-800 leading-relaxed">
                <b>⚠️ これは応急処置用の打刻方法です。</b>
                通常はLINEから打刻してください。
                月3回以上利用すると指導対象になります。
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {staff.length === 0 ? (
                  <p className="col-span-full text-center text-sm text-stone-500 py-12">
                    スタッフが見つかりません
                  </p>
                ) : (
                  staff.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectStaff(s)}
                      disabled={s.next_action === 'done'}
                      className={`relative p-4 rounded-2xl border-2 text-left transition ${
                        s.next_action === 'done'
                          ? 'border-stone-200 bg-stone-50 opacity-60 cursor-not-allowed'
                          : s.next_action === 'check_in'
                            ? 'border-blue-300 bg-white hover:border-blue-500 active:bg-blue-50'
                            : 'border-amber-300 bg-white hover:border-amber-500 active:bg-amber-50'
                      }`}
                    >
                      <p className="font-bold text-base text-stone-900 leading-tight mb-2">
                        {s.name}
                      </p>
                      <span
                        className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          s.next_action === 'done'
                            ? 'bg-stone-200 text-stone-600'
                            : s.next_action === 'check_in'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.next_action === 'done'
                          ? '本日勤務完了'
                          : s.next_action === 'check_in'
                            ? '出勤打刻'
                            : '退勤打刻'}
                      </span>
                      {!s.has_pin && (
                        <p className="text-[9px] text-red-600 mt-1.5 leading-tight">
                          PIN未設定
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* PIN 入力 */}
        {step === 'pin' && selected && (
          <div className="max-w-sm mx-auto">
            <div className="rounded-2xl border bg-white p-6 space-y-4">
              <div className="text-center">
                <Lock className="h-8 w-8 text-stone-700 mx-auto mb-2" />
                <h2 className="text-lg font-bold text-stone-900">{selected.name} さん</h2>
                <p className="text-xs text-stone-500 mt-1">タブレット打刻PINを入力</p>
              </div>
              <PinKeypad
                value={pin}
                onChange={(v) => {
                  setPin(v)
                  setPinError('')
                }}
                onSubmit={handlePinSubmit}
              />
              {pinError && (
                <p className="text-xs text-red-600 text-center">{pinError}</p>
              )}
              {monthCount !== null && monthCount >= 2 && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-2 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    今月 {monthCount} 回目の利用です（月3回で指導対象）
                  </p>
                </div>
              )}
              <button
                onClick={handlePinSubmit}
                disabled={pin.length < 4}
                className="w-full py-3 rounded-xl bg-stone-900 text-white font-semibold disabled:opacity-30"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        {/* 理由選択 */}
        {step === 'reason' && selected && (
          <div className="max-w-md mx-auto">
            <div className="rounded-2xl border bg-white p-5 space-y-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  {selected.name} さん /{' '}
                  {selected.next_action === 'check_in' ? '出勤' : '退勤'}打刻
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  タブレット打刻の理由を選んでください（必須）
                </p>
              </div>
              <div className="space-y-2">
                {TABLET_REASON_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setReasonPreset(p.key)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition ${
                      reasonPreset === p.key
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-800 border-stone-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {reasonPreset === 'other' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                    理由を記入 *
                  </label>
                  <textarea
                    rows={3}
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    placeholder="例: 充電器忘れ"
                    className="w-full rounded-lg border border-stone-300 p-2 text-sm"
                  />
                </div>
              )}
              {/* 任意補足（other 以外でも書ける） */}
              {reasonPreset && reasonPreset !== 'other' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                    補足（任意）
                  </label>
                  <input
                    type="text"
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    placeholder="例: 帰宅時に持ち帰り忘れ"
                    className="w-full rounded-lg border border-stone-300 p-2 text-sm"
                  />
                </div>
              )}
              <button
                onClick={handlePunchSubmit}
                disabled={!reasonPreset}
                className={`w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-30 ${
                  selected.next_action === 'check_in'
                    ? 'bg-blue-600'
                    : 'bg-amber-600'
                }`}
              >
                {selected.next_action === 'check_in' ? '出勤' : '退勤'}を記録する
              </button>
            </div>
          </div>
        )}

        {/* 送信中 */}
        {step === 'submitting' && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-stone-500" />
          </div>
        )}

        {/* 成功 */}
        {step === 'success' && selected && (
          <div className="max-w-sm mx-auto text-center py-8">
            <div className="w-20 h-20 rounded-full bg-green-100 mx-auto mb-5 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mb-1">
              {successAction === 'check_in' ? '出勤しました' : '退勤しました'}
            </h1>
            <p className="text-sm text-stone-600 mb-5">{selected.name} さん</p>
            <div className="rounded-2xl border bg-white p-5">
              <Clock className="h-5 w-5 text-stone-500 mx-auto mb-1" />
              <p className="text-3xl font-bold tabular-nums">{successTime}</p>
            </div>
            <p className="text-xs text-stone-500 mt-6">
              {countdown}秒後に一覧に戻ります
            </p>
            <button
              onClick={resetToList}
              className="mt-3 text-xs underline text-stone-600"
            >
              今すぐ戻る
            </button>
          </div>
        )}

        {/* エラー */}
        {step === 'error' && (
          <div className="max-w-sm mx-auto text-center py-8">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-red-700 mb-6 whitespace-pre-line">{error}</p>
            <button
              onClick={resetToList}
              className="px-6 py-2.5 rounded-lg bg-stone-900 text-white text-sm font-semibold"
            >
              一覧に戻る
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

// ============ PinKeypad ============
function PinKeypad({
  value,
  onChange,
  onSubmit,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
}) {
  const append = (c: string) => {
    if (value.length >= 8) return
    onChange(value + c)
  }
  const back = () => onChange(value.slice(0, -1))

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  return (
    <div>
      <div className="text-center tracking-[0.5em] font-mono text-2xl bg-stone-100 rounded-lg py-3 mb-3 select-none">
        {value.padEnd(4, '·').slice(0, Math.max(4, value.length))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {digits.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => append(d)}
            className="py-3 rounded-lg border bg-white text-lg font-bold active:bg-stone-100"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={back}
          className="py-3 rounded-lg border bg-white text-xs font-bold active:bg-stone-100"
        >
          ← 戻る
        </button>
        <button
          type="button"
          onClick={() => append('0')}
          className="py-3 rounded-lg border bg-white text-lg font-bold active:bg-stone-100"
        >
          0
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="py-3 rounded-lg bg-stone-900 text-white text-xs font-bold active:opacity-80"
        >
          OK
        </button>
      </div>
      <p className="text-[10px] text-stone-500 text-center mt-2">
        PIN は 4〜8 文字。英字も入力する場合はキーボードを使用
      </p>
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
}
