'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { getTreatmentSuggestions } from '@/actions/ai-suggest'
import type { SuggestionItem } from '@/lib/ai/suggest'

interface Props {
  customerId: string
  customerName: string
  /** メニュー名から取得時に呼ばれる（提案を1ボタンで反映用）。省略可 */
  onAdoptMenus?: (menuNames: string[]) => void
}

export function AiSuggestionButton({ customerId, customerName, onAdoptMenus }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [basis, setBasis] = useState<{
    pastVisits: number
    similarCases: number
    intakeFound: boolean
  } | null>(null)
  const [model, setModel] = useState<string | null>(null)

  const fetchSuggestions = async () => {
    setLoading(true)
    setError(null)
    setSuggestions(null)
    const res = await getTreatmentSuggestions(customerId)
    setLoading(false)
    if (res.ok && res.suggestions) {
      setSuggestions(res.suggestions)
      setBasis(res.basis || null)
      setModel(res.model || null)
    } else {
      setError(res.error || '取得に失敗しました')
    }
  }

  const handleOpen = () => {
    setOpen(true)
    // 初回は自動で取得
    if (!suggestions && !loading) {
      fetchSuggestions()
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-950"
      >
        <Sparkles className="h-4 w-4 mr-1.5 text-amber-600" />
        AI に施術提案させる
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              {customerName} 様への施術提案
            </DialogTitle>
            <DialogDescription className="text-xs">
              カルテ + お悩みアンケート + 過去症例から、AI が角度の高い施術プランを TOP3 で提案します
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              <p className="text-sm text-muted-foreground">
                過去症例を参照して提案を作成中...
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800 w-full">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={fetchSuggestions}>
                <RefreshCw className="h-3 w-3 mr-1" />
                再試行
              </Button>
            </div>
          )}

          {suggestions && suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <SuggestionCard
                  key={i}
                  index={i + 1}
                  suggestion={s}
                  onAdopt={
                    onAdoptMenus && s.menus.length > 0
                      ? () => {
                          onAdoptMenus(s.menus)
                          setOpen(false)
                        }
                      : undefined
                  }
                />
              ))}

              {basis && (
                <div className="text-[10px] text-muted-foreground border-t pt-3 mt-3 leading-relaxed">
                  <p>
                    📊 参照データ：
                    {basis.intakeFound ? '本人カルテあり' : '本人カルテなし'} ／
                    過去来店 {basis.pastVisits} 件 ／ 類似症例 {basis.similarCases} 件
                  </p>
                  {model && <p>🤖 {model}</p>}
                  <p className="mt-1 italic">
                    ※ 最終判断は担当スタッフが行ってください。AI は補助です
                  </p>
                </div>
              )}
            </div>
          )}

          {suggestions && suggestions.length === 0 && !loading && !error && (
            <p className="text-sm text-muted-foreground text-center py-6">
              提案を生成できませんでした
            </p>
          )}

          {suggestions && (
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchSuggestions}
                disabled={loading}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                再生成
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function SuggestionCard({
  index,
  suggestion,
  onAdopt,
}: {
  index: number
  suggestion: SuggestionItem
  onAdopt?: () => void
}) {
  const confColor =
    suggestion.confidence === 'high'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : suggestion.confidence === 'mid'
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-stone-100 text-stone-700 border-stone-300'
  const confLabel =
    suggestion.confidence === 'high'
      ? '推奨度 高'
      : suggestion.confidence === 'mid'
        ? '推奨度 中'
        : '推奨度 低'

  return (
    <div className="rounded-lg border bg-white p-3 space-y-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="shrink-0 w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">
            {index}
          </span>
          <h3 className="font-bold text-sm text-stone-900 leading-tight">{suggestion.title}</h3>
        </div>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${confColor}`}>
          {confLabel}
        </Badge>
      </div>

      {suggestion.menus.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-8">
          {suggestion.menus.map((m) => (
            <Badge key={m} variant="secondary" className="text-[10px] font-normal">
              {m}
            </Badge>
          ))}
        </div>
      )}

      <div className="pl-8 space-y-1.5 text-xs">
        <p className="leading-relaxed">
          <span className="font-semibold text-stone-600">根拠：</span>
          <span className="text-stone-700">{suggestion.reason}</span>
        </p>
        <p className="leading-relaxed">
          <span className="font-semibold text-stone-600">期待効果：</span>
          <span className="text-stone-700">{suggestion.expected}</span>
        </p>
      </div>

      {onAdopt && (
        <div className="pl-8 pt-1">
          <Button type="button" size="sm" variant="outline" onClick={onAdopt} className="h-7 text-xs">
            この提案のメニューを反映
          </Button>
        </div>
      )}
    </div>
  )
}
