'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MotivationChart } from '@/components/features/motivation-chart'
import { getDashboardStats, type DashboardData } from '@/actions/dashboard-stats'
import { Loader2 } from 'lucide-react'

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function formatCurrency(value: number): string {
  return value.toLocaleString('ja-JP')
}

export default function DashboardPage() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [startDate, setStartDate] = useState(formatDate(thirtyDaysAgo))
  const [endDate, setEndDate] = useState(formatDate(now))
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getDashboardStats(startDate, endDate)
      setData(result)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const setPreset = (type: 'last_30' | 'this_month' | 'last_month' | 'last_3_months' | 'last_year') => {
    const today = new Date()
    if (type === 'last_30') {
      const d = new Date(today)
      d.setDate(d.getDate() - 30)
      setStartDate(formatDate(d))
      setEndDate(formatDate(today))
    } else if (type === 'this_month') {
      setStartDate(formatDate(new Date(today.getFullYear(), today.getMonth(), 1)))
      setEndDate(formatDate(today))
    } else if (type === 'last_month') {
      setStartDate(formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)))
      setEndDate(formatDate(new Date(today.getFullYear(), today.getMonth(), 0)))
    } else if (type === 'last_3_months') {
      const d = new Date(today)
      d.setMonth(d.getMonth() - 3)
      setStartDate(formatDate(d))
      setEndDate(formatDate(today))
    } else {
      const d = new Date(today)
      d.setFullYear(d.getFullYear() - 1)
      setStartDate(formatDate(d))
      setEndDate(formatDate(today))
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">ダッシュボード</h2>

      {/* 期間指定 */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">開始日</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[155px] h-9"
              />
            </div>
            <span className="pb-2 text-muted-foreground">〜</span>
            <div className="space-y-1">
              <Label className="text-xs">終了日</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[155px] h-9"
              />
            </div>
            <div className="flex flex-wrap gap-1 pb-0.5">
              <Button variant="outline" size="sm" onClick={() => setPreset('last_30')}>直近30日</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('this_month')}>今月</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('last_month')}>先月</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('last_3_months')}>3ヶ月</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('last_year')}>1年</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 mr-2 animate-spin" />
          読み込み中...
        </div>
      ) : data ? (
        <>
          {/* 基本KPIカード（上段） */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">総顧客数</p>
                <p className="text-3xl font-bold mt-1">
                  {data.totalCustomers}
                  <span className="text-sm font-normal text-muted-foreground ml-1">人</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">LINE連携</p>
                <p className="text-3xl font-bold mt-1">
                  {data.lineCustomers}
                  <span className="text-sm font-normal text-muted-foreground ml-1">人</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">来店数</p>
                <p className="text-3xl font-bold mt-1">
                  {data.periodVisits}
                  <span className="text-sm font-normal text-muted-foreground ml-1">回</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">売上</p>
                <p className="text-3xl font-bold mt-1">
                  ¥{formatCurrency(data.periodRevenue)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 重要KPIカード（下段） */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">新規顧客</p>
                <p className="text-3xl font-bold mt-1">
                  {data.newCustomers}
                  <span className="text-sm font-normal text-muted-foreground ml-1">人</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">平均施術時間</p>
                <p className="text-3xl font-bold mt-1">
                  {data.avgDuration > 0 ? `${data.avgDuration}分` : '-'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">休眠顧客</p>
                <p className={`text-3xl font-bold mt-1 ${data.dormantCustomers > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {data.dormantCustomers}
                  <span className="text-sm font-normal text-muted-foreground ml-1">人</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">90日以上未来店</p>
              </CardContent>
            </Card>
            <Card className={data.lostCount > 0 ? 'border-red-200' : ''}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">失客予備軍</p>
                <p className={`text-3xl font-bold mt-1 ${data.lostCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {data.lostCount}
                  <span className="text-sm font-normal text-muted-foreground ml-1">人</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">60〜90日未来店</p>
              </CardContent>
            </Card>
          </div>

          {/* 来店動機 & スタイル別 */}
          <div className="grid md:grid-cols-2 gap-6">
            <MotivationChart startDate={startDate} endDate={endDate} />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">スタイル別来店数</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>スタイル</TableHead>
                      <TableHead className="text-center">来店数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(data.styleStats)
                      .sort(([, a], [, b]) => b - a)
                      .map(([name, count]) => (
                        <TableRow key={name}>
                          <TableCell>{name}</TableCell>
                          <TableCell className="text-center">{count}</TableCell>
                        </TableRow>
                      ))}
                    {Object.keys(data.styleStats).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                          データがありません
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* LINE配信状況 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">LINE配信状況</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>種類</TableHead>
                    <TableHead className="text-center">送信成功</TableHead>
                    <TableHead className="text-center">送信総数</TableHead>
                    <TableHead className="text-center">成功率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(data.lineStatsSummary).map(([type, stats]) => (
                    <TableRow key={type}>
                      <TableCell>
                        {{ thank_you: 'サンキューLINE', reminder1: 'リマインド①', reminder2: 'リマインド②', dormant: '休眠顧客' }[type]}
                      </TableCell>
                      <TableCell className="text-center">{stats.sent}</TableCell>
                      <TableCell className="text-center">{stats.total}</TableCell>
                      <TableCell className="text-center">
                        {stats.total > 0 ? `${Math.round((stats.sent / stats.total) * 100)}%` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          データの取得に失敗しました
        </div>
      )}
    </div>
  )
}
