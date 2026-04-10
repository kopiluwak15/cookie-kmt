'use client'

import { useState, useEffect, useMemo } from 'react'
import { createVisitLog } from '@/actions/visit-log'
import { CustomerSearch } from './customer-search'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import type { StyleSetting, ServiceMenuItem } from '@/types'
import { cn } from '@/lib/utils'
import { Clock, Check, X } from 'lucide-react'

// 悩みタグ（COOKIE 熊本：縮毛矯正・髪質改善サロン向け）
const CONCERN_PRESETS = [
  'くせ毛・うねり',
  '広がり',
  'ダメージ・パサつき',
  '白髪',
  'ボリューム不足',
  '朝のスタイリング困難',
  '湿気で崩れる',
  '退色が早い',
  '根元のクセ戻り',
  '枝毛・切れ毛',
  'まとまらない',
  'ツヤ不足',
]

// 施術要点タグ
const TREATMENT_PRESETS = [
  '酸性ストレート',
  'アルカリストレート',
  'ポイント矯正',
  'Lv弱め',
  'Lv標準',
  'Lv強め',
  '中間処理強化',
  '前処理オイル',
  '根元保護',
  'アイロン低温(140-160)',
  'アイロン中温(170-180)',
  'ぼかしカット',
  'カラー併用',
  'トリートメント併用',
  '酵素クレンジング',
]

// 薬剤カテゴリ・プリセット（COOKIE 熊本向け）
const CHEMICAL_CATEGORIES = [
  {
    label: 'ストレート',
    items: [
      '酸性ストレート1液', 'アルカリ1液', 'チオ系1液', 'シス系1液',
      '2液(過酸化水素)', '2液(臭素酸)', 'GMT', 'スピエラ',
    ],
  },
  {
    label: 'カラー',
    items: [
      'アルカリカラー', 'ノンジアミン', 'ヘアマニキュア', 'ブリーチ',
      'オキシ3%', 'オキシ6%', 'オキシ9%',
    ],
  },
  {
    label: 'パーマ',
    items: [
      'コスメパーマ液', 'チオ系パーマ', 'シス系パーマ', 'デジタルパーマ',
    ],
  },
  {
    label: 'トリートメント',
    items: [
      '酸熱トリートメント', '水素トリートメント', 'ケラチン補修',
      '酵素クレンジング', 'TOKIOインカラミ', 'オージュア',
    ],
  },
]

// カテゴリ表示順（service_menus.category と一致させる）
const CATEGORY_ORDER = [
  'カット',
  '部分カット',
  'カラー',
  'パーマ',
  'ストレート・縮毛矯正',
  'トリートメント',
  'ヘッドスパ',
  'オプション',
  'コスメパーマ',
  'セット・メイク',
  '店販（シャンプー）',
  '店販（トリートメント）',
  '店販（スタイリング）',
]

function getCurrentTimeString(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function calcDurationMinutes(checkin: string, checkout: string): number | null {
  if (!checkin || !checkout) return null
  const [ch, cm] = checkin.split(':').map(Number)
  const [oh, om] = checkout.split(':').map(Number)
  const diffMin = (oh * 60 + om) - (ch * 60 + cm)
  return diffMin > 0 ? diffMin : null
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}

interface VisitLogFormProps {
  styles: StyleSetting[]
  serviceMenus: ServiceMenuItem[]
  currentStaffName: string
}

export function VisitLogForm({
  styles,
  serviceMenus,
  currentStaffName,
}: VisitLogFormProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string
    customer_code: string
    name: string
    name_kana: string | null
    phone: string | null
    last_visit_date: string | null
    line_user_id: string | null
  } | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<StyleSetting | null>(null)
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null)
  const [selectedMenus, setSelectedMenus] = useState<ServiceMenuItem[]>([])
  const [checkinTime, setCheckinTime] = useState('')
  const [checkoutTime, setCheckoutTime] = useState('')
  const [price, setPrice] = useState('')
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false)
  const [otherAmount, setOtherAmount] = useState('')
  const [otherNote, setOtherNote] = useState('')
  const [chemicalTags, setChemicalTags] = useState<string[]>([])
  const [chemicalRaw, setChemicalRaw] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('')
  // 症例データ
  const [concernTags, setConcernTags] = useState<string[]>([])
  const [concernRaw, setConcernRaw] = useState('')
  const [treatmentTags, setTreatmentTags] = useState<string[]>([])
  const [treatmentRaw, setTreatmentRaw] = useState('')
  // 自由記述（コンセプトメニュー時のみ表示）
  const [counselingNotes, setCounselingNotes] = useState('')
  const [treatmentFindings, setTreatmentFindings] = useState('')
  const [nextProposal, setNextProposal] = useState('')

  // コンセプトメニューが選択されているか
  const hasConceptMenu = useMemo(
    () => selectedMenus.some((m) => m.is_concept),
    [selectedMenus]
  )

  // メニューをカテゴリでグループ化
  const categorizedMenus = useMemo(() => {
    const map = new Map<string, ServiceMenuItem[]>()
    for (const m of serviceMenus) {
      const cat = m.category || 'その他'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(m)
    }
    return map
  }, [serviceMenus])

  // カテゴリ一覧（CATEGORY_ORDER 順、それ以外は末尾）
  const orderedCategories = useMemo(() => {
    const cats = Array.from(categorizedMenus.keys())
    const sorted = CATEGORY_ORDER.filter((c) => cats.includes(c))
    const extras = cats.filter((c) => !CATEGORY_ORDER.includes(c))
    return [...sorted, ...extras]
  }, [categorizedMenus])

  // 初期カテゴリを設定
  useEffect(() => {
    if (!activeCategory && orderedCategories.length > 0) {
      setActiveCategory(orderedCategories[0])
    }
  }, [orderedCategories, activeCategory])

  // 初期値: 現在時刻をセット
  useEffect(() => {
    setCheckinTime(getCurrentTimeString())
  }, [])

  const handleStyleSelect = (style: StyleSetting) => {
    setSelectedStyle(prev => prev?.id === style.id ? null : style)
  }

  const handleMenuToggle = (menu: ServiceMenuItem) => {
    setSelectedMenus(prev => {
      const isSelected = prev.some(m => m.id === menu.id)
      if (isSelected) {
        return prev.filter(m => m.id !== menu.id)
      }
      return [...prev, menu]
    })
  }

  const handleSetNow = (field: 'checkin' | 'checkout') => {
    const now = getCurrentTimeString()
    if (field === 'checkin') setCheckinTime(now)
    else setCheckoutTime(now)
  }

  // 推定合計時間
  const totalEstimatedMinutes = selectedMenus.reduce(
    (sum, menu) => sum + menu.estimated_minutes, 0
  )

  // メニュー価格の合計（default_price 設定済みのみ）
  const totalMenuPrice = selectedMenus.reduce(
    (sum, menu) => sum + (menu.default_price ?? 0),
    0
  )

  // その他金額（マイナス可、割引対応）
  const otherAmountNum = otherAmount === '' || otherAmount === '-' ? 0 : Number(otherAmount)
  const safeOtherAmount = Number.isFinite(otherAmountNum) ? otherAmountNum : 0

  // 合計（メニュー + その他）
  const computedTotal = totalMenuPrice + safeOtherAmount

  // メニュー or その他 が変わったら、手動編集していなければ price を自動更新
  useEffect(() => {
    if (priceManuallyEdited) return
    setPrice(computedTotal !== 0 ? String(computedTotal) : '')
  }, [computedTotal, priceManuallyEdited])

  // 実際の滞在時間
  const actualMinutes = calcDurationMinutes(checkinTime, checkoutTime)

  // 60分基準時間（COOKIE 熊本は60分メニューが標準）
  const normalized30min = totalEstimatedMinutes > 0 && actualMinutes
    ? Math.round((actualMinutes / totalEstimatedMinutes) * 60 * 10) / 10
    : null

  const handleSubmit = async () => {
    if (!selectedCustomer || selectedMenus.length === 0 || !selectedStyle) {
      toast.error('お客様、サービスメニュー、スタイルを選択してください')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.set('customer_id', selectedCustomer.id)
      formData.set('service_menu', selectedMenus.map(m => m.name).join(', '))
      if (selectedStyle) {
        formData.set('style_category_id', selectedStyle.id)
      }
      formData.set('staff_name', currentStaffName)
      formData.set('expected_duration_minutes', String(totalEstimatedMinutes))

      // 来店・退店時刻をISO文字列に変換
      if (checkinTime) {
        const today = new Date().toISOString().split('T')[0]
        formData.set('checkin_at', `${today}T${checkinTime}:00`)
      }
      if (checkoutTime) {
        const today = new Date().toISOString().split('T')[0]
        formData.set('checkout_at', `${today}T${checkoutTime}:00`)
      }
      if (price) {
        formData.set('price', price)
      }

      // 薬剤記録（レギュラー・コンセプト共通）
      const chemParts: string[] = []
      if (chemicalTags.length > 0) chemParts.push(chemicalTags.join(', '))
      if (chemicalRaw.trim()) chemParts.push(chemicalRaw.trim())
      if (chemParts.length > 0) {
        formData.set('chemical_notes', chemParts.join('\n'))
      }

      // コンセプトメニュー判定（送信種別を分岐）
      if (hasConceptMenu) {
        formData.set('has_concept_menu', '1')
      }

      // 症例データ（コンセプトメニュー時のみ送信）
      if (hasConceptMenu) {
        if (concernTags.length > 0) {
          formData.set('concern_tags', concernTags.join(','))
        }
        if (concernRaw.trim()) {
          formData.set('concern_raw', concernRaw.trim())
        }
        if (treatmentTags.length > 0) {
          formData.set('treatment_tags', treatmentTags.join(','))
        }
        if (treatmentRaw.trim()) {
          formData.set('treatment_raw', treatmentRaw.trim())
        }
        if (counselingNotes.trim()) {
          formData.set('counseling_notes', counselingNotes.trim())
        }
        if (treatmentFindings.trim()) {
          formData.set('treatment_findings', treatmentFindings.trim())
        }
        if (nextProposal.trim()) {
          formData.set('next_proposal', nextProposal.trim())
        }
      }

      // その他の金額・備考を notes にまとめて保存
      if (safeOtherAmount !== 0 || otherNote.trim()) {
        const noteParts: string[] = []
        if (safeOtherAmount !== 0) {
          const sign = safeOtherAmount > 0 ? '+' : '−'
          noteParts.push(`その他: ${sign}¥${Math.abs(safeOtherAmount).toLocaleString()}`)
        }
        if (otherNote.trim()) {
          noteParts.push(otherNote.trim())
        }
        formData.set('notes', noteParts.join(' / '))
      }

      const result = await createVisitLog(formData)

      if (result.error) {
        toast.error(result.error)
        return
      }

      const lineStatus = selectedCustomer.line_user_id
        ? 'お礼LINEを送信しました。'
        : '（LINE未登録のお客様です）'

      toast.success(`記録完了しました。${lineStatus}`)

      // フォームリセット
      setSelectedCustomer(null)
      setSelectedStyle(null)
      setSelectedGender(null)
      setSelectedMenus([])
      setCheckinTime(getCurrentTimeString())
      setCheckoutTime('')
      setPrice('')
      setPriceManuallyEdited(false)
      setOtherAmount('')
      setOtherNote('')
      setConcernTags([])
      setConcernRaw('')
      setTreatmentTags([])
      setTreatmentRaw('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">施術ログ入力</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* お客様選択 */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">お客様</Label>
          <CustomerSearch
            onSelect={setSelectedCustomer}
            selectedCustomer={selectedCustomer}
            checkedInOnly
          />
        </div>

        {/* サービスメニュー（カテゴリタブ + 複数選択） */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label className="text-base font-semibold">サービスメニュー</Label>
            {selectedMenus.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedMenus([])}
                className="text-xs text-muted-foreground hover:text-red-600 underline"
              >
                選択をすべてクリア
              </button>
            )}
          </div>

          {/* 選択中チップ表示 */}
          {selectedMenus.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-md border border-blue-100">
              {selectedMenus.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMenuToggle(m)}
                  className="inline-flex items-center gap-1 bg-white border border-blue-200 rounded-full px-3 py-1 text-xs hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  {m.is_concept && <span className="text-amber-500">★</span>}
                  <span>{m.name}</span>
                  {m.default_price != null && (
                    <span className="text-muted-foreground">¥{m.default_price.toLocaleString()}</span>
                  )}
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {/* カテゴリタブ */}
          <div className="flex flex-wrap gap-1 border-b">
            {orderedCategories.map((cat) => {
              const isActive = activeCategory === cat
              const count = categorizedMenus.get(cat)?.length || 0
              const selectedInCat = selectedMenus.filter(
                (m) => (m.category || 'その他') === cat
              ).length
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {cat}
                  <span className="ml-1 text-xs opacity-60">({count})</span>
                  {selectedInCat > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center bg-blue-600 text-white text-[10px] rounded-full w-4 h-4">
                      {selectedInCat}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 選択中カテゴリのメニューグリッド */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(categorizedMenus.get(activeCategory) || []).map((menu) => {
              const isSelected = selectedMenus.some((m) => m.id === menu.id)
              return (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => handleMenuToggle(menu)}
                  className={cn(
                    'group relative w-full min-h-[64px] rounded-md border px-3 py-2 text-left transition-colors',
                    'flex items-start gap-2 overflow-hidden',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/40 ring-offset-1'
                      : 'bg-background hover:bg-accent hover:text-accent-foreground border-input'
                  )}
                >
                  {isSelected && (
                    <Check className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  <span className="flex flex-col flex-1 min-w-0 leading-tight">
                    <span className="flex items-start gap-1 min-w-0">
                      {menu.is_concept && (
                        <span className="text-amber-400 shrink-0">★</span>
                      )}
                      <span className="text-xs font-medium break-words whitespace-normal min-w-0 flex-1">
                        {menu.name}
                      </span>
                    </span>
                    <span className="text-[10px] opacity-70 mt-1 truncate">
                      {menu.default_price != null
                        ? `¥${menu.default_price.toLocaleString()}`
                        : '価格未設定'}
                      {menu.estimated_minutes > 0 && ` / ${menu.estimated_minutes}分`}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {totalEstimatedMinutes > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              推定施術時間: {formatDuration(totalEstimatedMinutes)}
            </p>
          )}
        </div>

        {/* スタイル選択（性別 → スタイル） */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">スタイル</Label>

          {/* 性別ボタン */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={selectedGender === 'male' ? 'default' : 'outline'}
              className={cn(
                'h-14 text-base',
                selectedGender === 'male' && 'ring-2 ring-offset-2'
              )}
              onClick={() => {
                setSelectedGender((prev) => (prev === 'male' ? null : 'male'))
                setSelectedStyle(null)
              }}
            >
              👨 男性
            </Button>
            <Button
              type="button"
              variant={selectedGender === 'female' ? 'default' : 'outline'}
              className={cn(
                'h-14 text-base',
                selectedGender === 'female' && 'ring-2 ring-offset-2'
              )}
              onClick={() => {
                setSelectedGender((prev) => (prev === 'female' ? null : 'female'))
                setSelectedStyle(null)
              }}
            >
              👩 女性
            </Button>
          </div>

          {/* スタイル一覧（性別選択後に展開） */}
          {selectedGender && (
            <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-md border">
              {styles
                .filter(
                  (s) =>
                    s.gender === selectedGender ||
                    s.gender === 'unisex' ||
                    s.gender == null
                )
                .map((style) => {
                  const isActive = selectedStyle?.id === style.id
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => handleStyleSelect(style)}
                      className={cn(
                        'w-full min-h-[44px] rounded-md border px-2 py-1.5 text-xs leading-tight break-words whitespace-normal transition-colors',
                        'flex items-center justify-center text-center',
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/40 ring-offset-1'
                          : 'bg-background hover:bg-accent hover:text-accent-foreground border-input'
                      )}
                    >
                      {style.style_name}
                    </button>
                  )
                })}
              {styles.filter(
                (s) =>
                  s.gender === selectedGender ||
                  s.gender === 'unisex' ||
                  s.gender == null
              ).length === 0 && (
                <p className="col-span-3 text-sm text-muted-foreground text-center py-2">
                  このカテゴリにはスタイルがありません
                </p>
              )}
            </div>
          )}
          {!selectedGender && (
            <p className="text-xs text-muted-foreground">
              先に男性 / 女性を選択するとスタイルが展開されます
            </p>
          )}
        </div>

        {/* 来店・退店時刻 */}
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            施術時間
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {/* 来店時刻 */}
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">来店</label>
              <div className="flex gap-1">
                <Input
                  type="time"
                  value={checkinTime}
                  onChange={(e) => setCheckinTime(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs px-2 shrink-0"
                  onClick={() => handleSetNow('checkin')}
                >
                  今
                </Button>
              </div>
            </div>
            {/* 退店時刻 */}
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">退店</label>
              <div className="flex gap-1">
                <Input
                  type="time"
                  value={checkoutTime}
                  onChange={(e) => setCheckoutTime(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs px-2 shrink-0"
                  onClick={() => handleSetNow('checkout')}
                >
                  今
                </Button>
              </div>
            </div>
          </div>
          {actualMinutes && (
            <div className="text-center space-y-0.5">
              <p className="text-sm font-medium text-blue-600">
                滞在時間: {formatDuration(actualMinutes)}
              </p>
              {normalized30min !== null && (
                <p className="text-xs text-amber-600 font-medium">
                  60分基準: {normalized30min}分
                </p>
              )}
            </div>
          )}
        </div>

        {/* その他（割引・追加料金など） */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">その他（割引・追加）</Label>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
              <Input
                type="number"
                inputMode="numeric"
                value={otherAmount}
                onChange={(e) => setOtherAmount(e.target.value)}
                placeholder="例: -500"
                className="pl-8"
              />
            </div>
            <Input
              type="text"
              value={otherNote}
              onChange={(e) => setOtherNote(e.target.value)}
              placeholder="備考（例: クーポン割引）"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            マイナスを入力すると割引として合計から差し引かれます。
          </p>
        </div>

        {/* 施術料金 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">施術料金</Label>
            {priceManuallyEdited && computedTotal !== 0 && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => {
                  setPriceManuallyEdited(false)
                  setPrice(String(computedTotal))
                }}
              >
                自動計算に戻す
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
            <Input
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value)
                setPriceManuallyEdited(true)
              }}
              placeholder="例: 4500"
              className="pl-8"
            />
          </div>
          {(totalMenuPrice > 0 || safeOtherAmount !== 0) && (
            <p className="text-xs text-muted-foreground text-right">
              メニュー ¥{totalMenuPrice.toLocaleString()}
              {safeOtherAmount !== 0 && (
                <>
                  {' '}
                  {safeOtherAmount > 0 ? '+' : '−'} ¥{Math.abs(safeOtherAmount).toLocaleString()}
                </>
              )}
              {' = '}
              <span className="font-bold text-foreground">
                ¥{computedTotal.toLocaleString()}
              </span>
              {!priceManuallyEdited && <span className="ml-1 text-green-600">（自動）</span>}
            </p>
          )}
        </div>

        {/* 担当スタッフ（ログインユーザー自動入力） */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">担当スタッフ</Label>
          <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-gray-50">
            <span className="font-medium">{currentStaffName}</span>
            <Badge variant="secondary" className="text-xs">ログイン中</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            不正防止のため、ログイン中のスタッフが自動で設定されます
          </p>
        </div>

        {/* 薬剤について（レギュラー・コンセプト共通） */}
        <div className="space-y-4 border-t pt-5">
          <div>
            <Label className="text-base font-semibold">
              💊 薬剤について
              <span className="ml-2 text-xs font-normal text-muted-foreground">任意</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              使用した薬剤をチップで選択＋補足を自由記述
            </p>
          </div>
          {CHEMICAL_CATEGORIES.map((cat) => (
            <div key={cat.label} className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">{cat.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.items.map((item) => {
                  const selected = chemicalTags.includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setChemicalTags((prev) =>
                          selected ? prev.filter((t) => t !== item) : [...prev, item]
                        )
                      }
                      className={cn(
                        'rounded-full px-3 py-1 text-xs border transition-colors',
                        selected
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-background hover:bg-violet-50 border-muted-foreground/20'
                      )}
                    >
                      {item}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {chemicalTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-violet-50">
              {chemicalTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => setChemicalTags((prev) => prev.filter((t) => t !== tag))}
                    className="ml-0.5 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <Textarea
            value={chemicalRaw}
            onChange={(e) => setChemicalRaw(e.target.value)}
            placeholder="補足（例: 1液 根元10分→中間5分 / オキシ6% 40g / アイロン160度）"
            rows={2}
            className="text-sm"
          />
        </div>

        {/* 症例データ：コンセプトメニュー時のみ表示 */}
        {hasConceptMenu && (
        <div className="space-y-4 border-t pt-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Label className="text-base font-semibold">
                症例メモ
                <span className="ml-2 text-xs font-normal text-amber-700">
                  コンセプトメニュー
                </span>
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                現状・カウンセリング・施術での発見・申し送りを記録 → AIが要約しリピート分析に活用
              </p>
            </div>
          </div>

          {/* 現状チップ（美容師から見た毛髪の現状） */}
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              📋 現状
              {concernTags.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {concernTags.length}件選択中
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CONCERN_PRESETS.map((tag) => {
                const selected = concernTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setConcernTags((prev) =>
                        selected ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }
                    className={cn(
                      'rounded-full px-3 py-1 text-xs border transition-colors',
                      selected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-background hover:bg-blue-50 border-muted-foreground/20'
                    )}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
            <Input
              type="text"
              value={concernRaw}
              onChange={(e) => setConcernRaw(e.target.value)}
              placeholder="補足があれば自由記述（例: 右側の方がうねりが強い、中間部のダメージ進行）"
              className="text-sm"
            />
          </div>

          {/* 施術要点チップ */}
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              ✂️ 施術要点
              {treatmentTags.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {treatmentTags.length}件選択中
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TREATMENT_PRESETS.map((tag) => {
                const selected = treatmentTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setTreatmentTags((prev) =>
                        selected ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }
                    className={cn(
                      'rounded-full px-3 py-1 text-xs border transition-colors',
                      selected
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-background hover:bg-emerald-50 border-muted-foreground/20'
                    )}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
            <Input
              type="text"
              value={treatmentRaw}
              onChange={(e) => setTreatmentRaw(e.target.value)}
              placeholder="補足があれば自由記述（例: 既矯正部は避けて根元のみ）"
              className="text-sm"
            />
          </div>

          {/* 自由記述: カウンセリング */}
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              🗣️ カウンセリングで出てきた話
            </div>
            <Textarea
              value={counselingNotes}
              onChange={(e) => setCounselingNotes(e.target.value)}
              placeholder={
                'お客様の言葉そのままで構いません。\n例: 子どもが生まれてから朝の支度に時間が取れない / 結婚式が3ヶ月後にあるのでそれまでにツヤを出したい / 前回の縮毛で根元がペタッとなった'
              }
              rows={4}
              className="text-sm"
            />
          </div>

          {/* 自由記述: 施術での発見 */}
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              🔍 施術での発見
            </div>
            <Textarea
              value={treatmentFindings}
              onChange={(e) => setTreatmentFindings(e.target.value)}
              placeholder={
                '施術中に気づいた毛髪の状態・薬剤の反応・想定外の挙動など。\n例: 中間部のダメージが想像より進行 / 1液は中間まで延ばしたが、根元は2分短縮で十分 / 右側の方がうねりが強い'
              }
              rows={4}
              className="text-sm"
            />
          </div>

          {/* 自由記述: 次回への提案・申し送り */}
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              📌 次回への提案・申し送り
            </div>
            <Textarea
              value={nextProposal}
              onChange={(e) => setNextProposal(e.target.value)}
              placeholder={
                '次回担当が読む前提で記入。\n例: 2ヶ月後に根元のリタッチ＋トリートメント推奨 / 次回はLv標準で十分 / アイロン温度は必ず160度以下'
              }
              rows={4}
              className="text-sm"
            />
          </div>
        </div>
        )}

        {/* 送信ボタン */}
        <Button
          className="w-full h-14 text-lg"
          onClick={handleSubmit}
          disabled={
            submitting ||
            !selectedCustomer ||
            selectedMenus.length === 0 ||
            !selectedStyle
          }
        >
          {submitting ? '記録中...' : '記録する'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          LINE登録済みのお客様にはお礼LINEが自動送信されます
        </p>
      </CardContent>
    </Card>
  )
}
