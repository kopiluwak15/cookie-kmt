'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  TrendingUp,
  Target,
  JapaneseYen,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import {
  getDeliveryAttribution,
  type DeliveryAttribution,
} from '@/actions/line-delivery-attribution'
import { Button } from '@/components/ui/button'

interface Props {
  templateType: string
  /** 来店判定窓（日数）。デフォルト30日 */
  windowDays?: number
  /** 集計対象期間（日数）。デフォルト90日 */
  rangeDays?: number
  /** カードに表示するセクション見出し */
  title?: string
}

/**
 * 配信実績カード（来店アトリビューション）
 *
 * 過去 rangeDays 日の配信のうち、windowDays 以内に来店した
 * 件数・率・売上貢献額を表示する。
 */
export function DeliveryAttributionCard({
  templateType,
  windowDays = 30,
  rangeDays = 90,
  title = '配信実績（来店アトリビューション）',
}: Props) {
  const [data, setData] = useState<DeliveryAttribution | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const result = await getDeliveryAttribution(
        templateType,
        windowDays,
        rangeDays
      )
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateType, windowDays, rangeDays])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              {title}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              過去{rangeDays}日の配信を対象に、{windowDays}日以内の来店を集計
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw
              className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`}
            />
            更新
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.totalSent === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            過去{rangeDays}日に配信実績がありません
          </p>
        ) : (
          <div className="space-y-4">
            {/* KPI 3つ */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  配信数
                </div>
                <div className="text-2xl font-bold mt-1">
                  {data.totalSent}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    件
                  </span>
                </div>
              </div>
              <div className="rounded-lg border bg-emerald-50 border-emerald-200 p-3">
                <div className="text-xs text-emerald-700 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  来店件数
                </div>
                <div className="text-2xl font-bold mt-1 text-emerald-700">
                  {data.totalAttributed}
                  <span className="text-xs font-normal ml-1">件</span>
                </div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  来店率 {data.attributionRate}%
                </div>
              </div>
              <div className="rounded-lg border bg-amber-50 border-amber-200 p-3">
                <div className="text-xs text-amber-700 flex items-center gap-1">
                  <JapaneseYen className="h-3 w-3" />
                  推定売上貢献
                </div>
                <div className="text-2xl font-bold mt-1 text-amber-700 tabular-nums">
                  ¥{data.totalRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-amber-700 mt-0.5">
                  該当来店の合計
                </div>
              </div>
            </div>

            {/* 直近の成功事例 */}
            {data.recentExamples.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">
                  直近の来店事例（最大10件）
                </p>
                <div className="rounded-lg border divide-y">
                  {data.recentExamples.map((ex, i) => {
                    const sentAt = new Date(ex.sentAt)
                    const sentDateStr = `${sentAt.getMonth() + 1}/${sentAt.getDate()}`
                    const visitDate = new Date(ex.visitDate)
                    const visitDateStr = `${visitDate.getMonth() + 1}/${visitDate.getDate()}`
                    return (
                      <div
                        key={i}
                        className="px-3 py-2 flex items-center justify-between text-sm gap-2 flex-wrap"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                            {sentDateStr} 配信
                          </span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-xs font-semibold text-emerald-700 tabular-nums shrink-0">
                            {visitDateStr} 来店
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {ex.daysToVisit}日後
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium truncate">
                            {ex.customerCode || '---'} {ex.customerName}
                          </span>
                          {ex.price != null && (
                            <span className="text-xs text-amber-700 tabular-nums">
                              ¥{ex.price.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
