'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getRepeatAnalysis,
  getCellCustomers,
  sendLineToCustomers,
  type RepeatAnalysisResult,
  type CellCustomerInfo,
  type CategoryRow,
  type MenuFilter,
} from '@/actions/repeat-analysis'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Send, Users, MessageSquare } from 'lucide-react'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

function getDemoRepeatAnalysis(year: number, month: number, _menuFilter: MenuFilter = 'all'): RepeatAnalysisResult {
  void _menuFilter
  function getMonthLabel(baseMonth: number, offset: number): string {
    const m = ((baseMonth - 1 + offset) % 12) + 1
    return `${m}月`
  }

  const categories: CategoryRow[] = [
    {
      key: 'new', label: '新規', color: '#4CAF50', visitCount: 8, ratio: 19.0,
      customerIds: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'],
      months: [
        { offset: 1, label: `1ヶ月後（${getMonthLabel(month, 1)}）`, count: 3, cumulativeRate: 37.5, customerIds: ['d1', 'd2', 'd3'] },
        { offset: 2, label: `2ヶ月後（${getMonthLabel(month, 2)}）`, count: 1, cumulativeRate: 50.0, customerIds: ['d4'] },
        { offset: 3, label: `3ヶ月後（${getMonthLabel(month, 3)}）`, count: 0, cumulativeRate: 50.0, customerIds: [] },
        { offset: 4, label: `4ヶ月後（${getMonthLabel(month, 4)}）`, count: 0, cumulativeRate: 50.0, customerIds: [] },
        { offset: 5, label: `5ヶ月後（${getMonthLabel(month, 5)}）`, count: 0, cumulativeRate: 50.0, customerIds: [] },
        { offset: 6, label: `6ヶ月後（${getMonthLabel(month, 6)}）`, count: 0, cumulativeRate: 50.0, customerIds: [] },
      ],
      lost: { count: 4, rate: 50.0, customerIds: ['d5', 'd6', 'd7', 'd8'] },
    },
    {
      key: 'return', label: '再来', color: '#FF9800', visitCount: 10, ratio: 23.8,
      customerIds: ['d9', 'd10', 'd11', 'd12', 'd13', 'd14', 'd15', 'd16', 'd17', 'd18'],
      months: [
        { offset: 1, label: `1ヶ月後（${getMonthLabel(month, 1)}）`, count: 5, cumulativeRate: 50.0, customerIds: ['d9', 'd10', 'd11', 'd12', 'd13'] },
        { offset: 2, label: `2ヶ月後（${getMonthLabel(month, 2)}）`, count: 2, cumulativeRate: 70.0, customerIds: ['d14', 'd15'] },
        { offset: 3, label: `3ヶ月後（${getMonthLabel(month, 3)}）`, count: 1, cumulativeRate: 80.0, customerIds: ['d16'] },
        { offset: 4, label: `4ヶ月後（${getMonthLabel(month, 4)}）`, count: 0, cumulativeRate: 80.0, customerIds: [] },
        { offset: 5, label: `5ヶ月後（${getMonthLabel(month, 5)}）`, count: 0, cumulativeRate: 80.0, customerIds: [] },
        { offset: 6, label: `6ヶ月後（${getMonthLabel(month, 6)}）`, count: 0, cumulativeRate: 80.0, customerIds: [] },
      ],
      lost: { count: 2, rate: 20.0, customerIds: ['d17', 'd18'] },
    },
    {
      key: 'regular', label: '固定', color: '#2196F3', visitCount: 20, ratio: 47.6,
      customerIds: Array.from({ length: 20 }, (_, i) => `r${i + 1}`),
      months: [
        { offset: 1, label: `1ヶ月後（${getMonthLabel(month, 1)}）`, count: 14, cumulativeRate: 70.0, customerIds: Array.from({ length: 14 }, (_, i) => `r${i + 1}`) },
        { offset: 2, label: `2ヶ月後（${getMonthLabel(month, 2)}）`, count: 3, cumulativeRate: 85.0, customerIds: ['r15', 'r16', 'r17'] },
        { offset: 3, label: `3ヶ月後（${getMonthLabel(month, 3)}）`, count: 1, cumulativeRate: 90.0, customerIds: ['r18'] },
        { offset: 4, label: `4ヶ月後（${getMonthLabel(month, 4)}）`, count: 0, cumulativeRate: 90.0, customerIds: [] },
        { offset: 5, label: `5ヶ月後（${getMonthLabel(month, 5)}）`, count: 0, cumulativeRate: 90.0, customerIds: [] },
        { offset: 6, label: `6ヶ月後（${getMonthLabel(month, 6)}）`, count: 0, cumulativeRate: 90.0, customerIds: [] },
      ],
      lost: { count: 2, rate: 10.0, customerIds: ['r19', 'r20'] },
    },
    {
      key: 'winback', label: 'リターン', color: '#9C27B0', visitCount: 4, ratio: 9.5,
      customerIds: ['w1', 'w2', 'w3', 'w4'],
      months: [
        { offset: 1, label: `1ヶ月後（${getMonthLabel(month, 1)}）`, count: 1, cumulativeRate: 25.0, customerIds: ['w1'] },
        { offset: 2, label: `2ヶ月後（${getMonthLabel(month, 2)}）`, count: 1, cumulativeRate: 50.0, customerIds: ['w2'] },
        { offset: 3, label: `3ヶ月後（${getMonthLabel(month, 3)}）`, count: 0, cumulativeRate: 50.0, customerIds: [] },
        { offset: 4, label: `4ヶ月後（${getMonthLabel(month, 4)}）`, count: 0, cumulativeRate: 50.0, customerIds: [] },
        { offset: 5, label: `5ヶ月後（${getMonthLabel(month, 5)}）`, count: 0, cumulativeRate: 50.0, customerIds: [] },
        { offset: 6, label: `6ヶ月後（${getMonthLabel(month, 6)}）`, count: 0, cumulativeRate: 50.0, customerIds: [] },
      ],
      lost: { count: 2, rate: 50.0, customerIds: ['w3', 'w4'] },
    },
  ]

  return {
    targetYear: year,
    targetMonth: month,
    categories,
    totals: {
      visitCount: 42,
      months: [
        { offset: 1, count: 23, cumulativeRate: 54.8 },
        { offset: 2, count: 7, cumulativeRate: 71.4 },
        { offset: 3, count: 2, cumulativeRate: 76.2 },
        { offset: 4, count: 0, cumulativeRate: 76.2 },
        { offset: 5, count: 0, cumulativeRate: 76.2 },
        { offset: 6, count: 0, cumulativeRate: 76.2 },
      ],
      lost: { count: 10, rate: 23.8 },
    },
  }
}

function getDemoCellCustomers(customerIds: string[]): CellCustomerInfo[] {
  const demoPool: CellCustomerInfo[] = [
    { id: 'd1', customer_code: 'C-0101', name: '小林 一郎', phone: '090-1111-2222', line_user_id: 'U101', line_blocked: false, last_visit_date: '2025-12-15' },
    { id: 'd2', customer_code: 'C-0102', name: '加藤 二郎', phone: '090-2222-3333', line_user_id: 'U102', line_blocked: false, last_visit_date: '2025-12-10' },
    { id: 'd3', customer_code: 'C-0103', name: '吉田 三郎', phone: '080-3333-4444', line_user_id: null, line_blocked: false, last_visit_date: '2025-12-05' },
    { id: 'd4', customer_code: 'C-0104', name: '松本 四郎', phone: '070-4444-5555', line_user_id: 'U104', line_blocked: true, last_visit_date: '2025-11-20' },
    { id: 'd5', customer_code: 'C-0105', name: '井上 五郎', phone: '090-5555-6666', line_user_id: 'U105', line_blocked: false, last_visit_date: '2025-10-15' },
  ]
  return demoPool.slice(0, Math.min(customerIds.length, demoPool.length))
}

// ============================================
// セル情報の型
// ============================================

interface CellInfo {
  label: string
  customerIds: string[]
  categoryLabel: string
  type: 'visitors' | 'month' | 'lost'
  monthOffset?: number
}

// ============================================
// メインコンポーネント
// ============================================

export default function RepeatAnalysisPage() {
  const now = new Date()
  const defaultYear = now.getFullYear()
  const defaultMonth = now.getMonth() + 1 // 当月

  const [year, setYear] = useState(defaultYear)
  const [month, setMonth] = useState(defaultMonth)
  const [menuFilter, setMenuFilter] = useState<MenuFilter>('all')
  const [data, setData] = useState<RepeatAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)

  // ダイアログ関連
  const [selectedCell, setSelectedCell] = useState<CellInfo | null>(null)
  const [cellCustomers, setCellCustomers] = useState<CellCustomerInfo[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [lineMessage, setLineMessage] = useState('')
  const [sending, setSending] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (!isSupabaseConfigured) {
        const result = getDemoRepeatAnalysis(year, month, menuFilter)
        setData(result)
      } else {
        const result = await getRepeatAnalysis(year, month, menuFilter)
        setData(result)
      }
    } catch {
      toast.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [year, month, menuFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  // セルクリック時
  async function handleCellClick(cell: CellInfo) {
    if (cell.customerIds.length === 0) return
    setSelectedCell(cell)
    setCellCustomers([])
    setLineMessage('')
    setLoadingCustomers(true)
    try {
      if (!isSupabaseConfigured) {
        setCellCustomers(getDemoCellCustomers(cell.customerIds))
      } else {
        const customers = await getCellCustomers(cell.customerIds)
        setCellCustomers(customers)
      }
    } catch {
      toast.error('顧客情報の取得に失敗しました')
    } finally {
      setLoadingCustomers(false)
    }
  }

  // LINE送信
  async function handleSendLine() {
    if (!selectedCell || !lineMessage.trim()) return
    if (!isSupabaseConfigured) {
      toast.success('デモモード: LINE送信しました（実際には送信されません）')
      setSelectedCell(null)
      return
    }
    setSending(true)
    try {
      const result = await sendLineToCustomers(
        selectedCell.customerIds,
        lineMessage
      )
      toast.success(
        `送信完了: ${result.sent}件成功${result.failed > 0 ? `、${result.failed}件失敗` : ''}${result.blocked > 0 ? `、${result.blocked}件ブロック` : ''}`
      )
      setSelectedCell(null)
    } catch {
      toast.error('LINE送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  const lineEligible = cellCustomers.filter(
    (c) => c.line_user_id && !c.line_blocked
  )

  // 年の選択肢（2024〜今年）
  const yearOptions = []
  for (let y = 2024; y <= now.getFullYear(); y++) {
    yearOptions.push(y)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold">リピート分析</h2>
        {menuFilter === 'concept' && (
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
            ★ コンセプトメニューのみ
          </Badge>
        )}
      </div>

      {!isSupabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          デモモードで表示中です。Supabaseの認証情報を .env.local に設定すると実データが表示されます。
        </div>
      )}

      {/* 期間選択 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium">分析期間：</span>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(month)}
              onValueChange={(v) => setMonth(Number(v))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              に来店したお客様の再来店状況を出力する
            </span>

            {/* メニュー絞り込みトグル */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm font-medium">対象メニュー：</span>
              <div className="inline-flex rounded-md border bg-background overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMenuFilter('all')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    menuFilter === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  全メニュー
                </button>
                <button
                  type="button"
                  onClick={() => setMenuFilter('concept')}
                  className={`px-3 py-1.5 text-sm font-medium border-l transition-colors ${
                    menuFilter === 'concept'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  ★ コンセプトメニュー
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span>
          <Badge
            variant="outline"
            className="border-green-500 text-green-700 mr-1"
          >
            新規
          </Badge>
          1回目の来店のお客様
        </span>
        <span>
          <Badge
            variant="outline"
            className="border-orange-500 text-orange-700 mr-1"
          >
            再来
          </Badge>
          2回目の来店のお客様
        </span>
        <span>
          <Badge
            variant="outline"
            className="border-blue-500 text-blue-700 mr-1"
          >
            固定
          </Badge>
          3回目以上の来店のお客様
        </span>
        <span>
          <Badge
            variant="outline"
            className="border-purple-500 text-purple-700 mr-1"
          >
            リターン
          </Badge>
          6ヶ月以上来店がない状態で再度来店
        </span>
      </div>

      {/* 分析テーブル */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          分析データを読み込み中...
        </div>
      ) : data ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            {/* ヘッダー1行目 */}
            <thead>
              <tr className="bg-slate-100">
                <th
                  colSpan={3}
                  className="border px-3 py-2 text-center font-bold bg-slate-200"
                >
                  {year}年{month}月来店
                </th>
                <th
                  colSpan={data.categories[0]?.months.length * 2 || 6}
                  className="border px-3 py-2 text-center font-bold bg-blue-50"
                >
                  再来店月
                </th>
                <th
                  colSpan={2}
                  className="border px-3 py-2 text-center font-bold bg-red-50"
                >
                  失客
                </th>
              </tr>

              {/* ヘッダー2行目 */}
              <tr className="bg-slate-50">
                <th className="border px-3 py-2" rowSpan={1}></th>
                <th className="border px-3 py-2" rowSpan={1}></th>
                <th className="border px-3 py-2" rowSpan={1}></th>
                {data.categories[0]?.months.map((m) => (
                  <th
                    key={m.offset}
                    colSpan={2}
                    className="border px-3 py-2 text-center bg-blue-50"
                  >
                    {m.label}
                  </th>
                ))}
                <th className="border px-3 py-2" rowSpan={1}></th>
                <th className="border px-3 py-2" rowSpan={1}></th>
              </tr>

              {/* ヘッダー3行目 */}
              <tr className="bg-slate-50 text-xs">
                <th className="border px-3 py-2 min-w-[72px]">来店区分</th>
                <th className="border px-3 py-2 min-w-[72px] text-center">
                  来店客数
                </th>
                <th className="border px-3 py-2 min-w-[64px] text-center">
                  構成比
                </th>
                {data.categories[0]?.months.map((m) => (
                  <Fragment key={m.offset}>
                    <th className="border px-3 py-2 min-w-[56px] text-center">
                      客数
                    </th>
                    <th className="border px-3 py-2 min-w-[64px] text-center">
                      再来率
                    </th>
                  </Fragment>
                ))}
                <th className="border px-3 py-2 min-w-[56px] text-center">
                  失客数
                </th>
                <th className="border px-3 py-2 min-w-[64px] text-center">
                  失客率
                </th>
              </tr>
            </thead>

            <tbody>
              {data.categories.map((cat) => (
                <CategoryTableRow
                  key={cat.key}
                  category={cat}
                  onCellClick={handleCellClick}
                />
              ))}

              {/* 合計行 */}
              <tr className="bg-slate-100 font-bold">
                <td className="border px-3 py-2 text-center">合計</td>
                <td className="border px-3 py-2 text-center">
                  {data.totals.visitCount}
                </td>
                <td className="border px-3 py-2 text-center">100.0%</td>
                {data.totals.months.map((m) => (
                  <Fragment key={m.offset}>
                    <td className="border px-3 py-2 text-center">{m.count}</td>
                    <td className="border px-3 py-2 text-center">
                      {m.cumulativeRate}%
                    </td>
                  </Fragment>
                ))}
                <td className="border px-3 py-2 text-center">
                  {data.totals.lost.count}
                </td>
                <td className="border px-3 py-2 text-center">
                  {data.totals.lost.rate}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        セルの数字をクリックすると、対象顧客の一覧表示とLINE送信ができます。
      </p>

      {/* LINE送信ダイアログ */}
      <Dialog
        open={!!selectedCell}
        onOpenChange={(open) => !open && setSelectedCell(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedCell?.categoryLabel} - {selectedCell?.label}
              <Badge variant="secondary">{selectedCell?.customerIds.length}名</Badge>
            </DialogTitle>
          </DialogHeader>

          {loadingCustomers ? (
            <div className="py-8 text-center text-muted-foreground">
              読み込み中...
            </div>
          ) : (
            <div className="space-y-4">
              {/* 顧客一覧 */}
              <div className="max-h-48 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">顧客ID</th>
                      <th className="px-3 py-2 text-left">名前</th>
                      <th className="px-3 py-2 text-left">電話番号</th>
                      <th className="px-3 py-2 text-center">LINE</th>
                      <th className="px-3 py-2 text-left">最終来店</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cellCustomers.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="px-3 py-1.5">{c.customer_code}</td>
                        <td className="px-3 py-1.5">{c.name}</td>
                        <td className="px-3 py-1.5">{c.phone || '-'}</td>
                        <td className="px-3 py-1.5 text-center">
                          {c.line_user_id ? (
                            c.line_blocked ? (
                              <Badge variant="destructive" className="text-xs">
                                ブロック
                              </Badge>
                            ) : (
                              <Badge variant="default" className="text-xs">
                                OK
                              </Badge>
                            )
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              未連携
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          {c.last_visit_date || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* LINE送信情報 */}
              <div className="bg-blue-50 rounded-md p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">LINE送信対象</span>
                </div>
                <p>
                  全{cellCustomers.length}名中、LINE送信可能:{' '}
                  <span className="font-bold text-blue-700">
                    {lineEligible.length}名
                  </span>
                  {cellCustomers.length - lineEligible.length > 0 && (
                    <span className="text-muted-foreground ml-2">
                      （未連携/ブロック:{' '}
                      {cellCustomers.length - lineEligible.length}名）
                    </span>
                  )}
                </p>
              </div>

              {/* メッセージ入力 */}
              {lineEligible.length > 0 && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>送信メッセージ</Label>
                    <Textarea
                      rows={4}
                      value={lineMessage}
                      onChange={(e) => setLineMessage(e.target.value)}
                      placeholder="例: お元気ですか？COOKIE 熊本です。またのご来店をお待ちしております。"
                    />
                    <p className="text-xs text-muted-foreground">
                      各顧客の「○○様」は自動で付与されます。
                    </p>
                  </div>

                  <Button
                    onClick={handleSendLine}
                    disabled={sending || !lineMessage.trim()}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sending
                      ? '送信中...'
                      : `${lineEligible.length}名にLINE送信`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// Fragment import
// ============================================

import { Fragment } from 'react'

// ============================================
// カテゴリ行コンポーネント
// ============================================

function CategoryTableRow({
  category,
  onCellClick,
}: {
  category: CategoryRow
  onCellClick: (cell: CellInfo) => void
}) {
  // 最大客数の月を見つける（赤文字表示用）
  const maxCount = Math.max(...category.months.map((m) => m.count))

  return (
    <tr className="hover:bg-slate-50">
      {/* 来店区分 */}
      <td className="border px-3 py-2 text-center">
        <span
          className="font-bold"
          style={{ color: category.color }}
        >
          {category.label}
        </span>
      </td>

      {/* 来店客数 */}
      <td className="border px-3 py-2 text-center">
        <CellButton
          value={category.visitCount}
          onClick={() =>
            onCellClick({
              label: '来店客',
              customerIds: category.customerIds,
              categoryLabel: category.label,
              type: 'visitors',
            })
          }
        />
      </td>

      {/* 構成比 */}
      <td className="border px-3 py-2 text-center">{category.ratio}%</td>

      {/* 各月 */}
      {category.months.map((m) => (
        <Fragment key={m.offset}>
          {/* 客数 */}
          <td className="border px-3 py-2 text-center">
            <CellButton
              value={m.count}
              highlight={m.count > 0 && m.count === maxCount}
              onClick={() =>
                onCellClick({
                  label: `${m.label}に初再来`,
                  customerIds: m.customerIds,
                  categoryLabel: category.label,
                  type: 'month',
                  monthOffset: m.offset,
                })
              }
            />
          </td>
          {/* 再来率 */}
          <td className="border px-3 py-2 text-center">{m.cumulativeRate}%</td>
        </Fragment>
      ))}

      {/* 失客数 */}
      <td className="border px-3 py-2 text-center">
        <CellButton
          value={category.lost.count}
          warn
          onClick={() =>
            onCellClick({
              label: '6ヶ月以内に未再来（失客）',
              customerIds: category.lost.customerIds,
              categoryLabel: category.label,
              type: 'lost',
            })
          }
        />
      </td>

      {/* 失客率 */}
      <td className="border px-3 py-2 text-center text-red-600">
        {category.lost.rate}%
      </td>
    </tr>
  )
}

// ============================================
// クリック可能なセルボタン
// ============================================

function CellButton({
  value,
  highlight,
  warn,
  onClick,
}: {
  value: number
  highlight?: boolean
  warn?: boolean
  onClick: () => void
}) {
  if (value === 0) {
    return <span className="text-muted-foreground">0</span>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        font-medium cursor-pointer hover:underline transition-colors
        ${highlight ? 'text-red-600 font-bold' : ''}
        ${warn ? 'text-red-500' : ''}
        ${!highlight && !warn ? 'text-blue-600 hover:text-blue-800' : ''}
      `}
      title="クリックで顧客一覧・LINE送信"
    >
      {value}
    </button>
  )
}
