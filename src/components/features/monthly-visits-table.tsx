'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface MonthlyVisitDetail {
  visit_date: string
  customer_name: string
  service_menu: string
  style_name: string
  price: number
  duration: number | null
}

interface MonthlySummary {
  month: string
  label: string
  revenue: number
  count: number
  avgPrice: number
  avgDuration: number | null
  avg30min: number | null
  visits: MonthlyVisitDetail[]
}

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

interface MonthlyVisitsTableProps {
  monthlySummary: MonthlySummary[]
  employmentType: string | null
  commissionRate: number
  baseSalary: number | null
  compensationHeader: string
}

function toExTax(taxIncluded: number): number {
  return Math.round(taxIncluded / 1.1)
}

function getCompensationLabel(revenue: number, employmentType: string | null, commissionRate: number, baseSalary: number | null): string {
  if (employmentType === 'contractor') {
    const exTaxRevenue = toExTax(revenue)
    return formatCurrency(Math.round(exTaxRevenue * commissionRate))
  }
  if (employmentType === 'full_time' && baseSalary) {
    return formatCurrency(baseSalary)
  }
  return '-'
}

export function MonthlyVisitsTable({
  monthlySummary,
  employmentType,
  commissionRate,
  baseSalary,
  compensationHeader,
}: MonthlyVisitsTableProps) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)

  const toggleMonth = (month: string) => {
    setExpandedMonth(prev => prev === month ? null : month)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">月別実績</CardTitle>
        <p className="text-xs text-muted-foreground">各月の行をタップすると入客一覧が表示されます</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>月</TableHead>
                <TableHead className="text-right">売上</TableHead>
                <TableHead className="text-center">客数</TableHead>
                <TableHead className="text-right">客単価</TableHead>
                <TableHead className="text-center">平均タイム</TableHead>
                <TableHead className="text-center">60分基準</TableHead>
                <TableHead className="text-right">{compensationHeader}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlySummary.length > 0 ? (
                monthlySummary.map((m) => {
                  const isExpanded = expandedMonth === m.month
                  return (
                    <MonthRow
                      key={m.month}
                      summary={m}
                      isExpanded={isExpanded}
                      onToggle={() => toggleMonth(m.month)}
                      compensationLabel={getCompensationLabel(m.revenue, employmentType, commissionRate, baseSalary)}
                    />
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                    データがありません
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function MonthRow({
  summary,
  isExpanded,
  onToggle,
  compensationLabel,
}: {
  summary: MonthlySummary
  isExpanded: boolean
  onToggle: () => void
  compensationLabel: string
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <TableCell className="w-8 px-2">
          {isExpanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          }
        </TableCell>
        <TableCell className="font-medium">{summary.label}</TableCell>
        <TableCell className="text-right">{formatCurrency(summary.revenue)}</TableCell>
        <TableCell className="text-center">{summary.count}人</TableCell>
        <TableCell className="text-right">{formatCurrency(summary.avgPrice)}</TableCell>
        <TableCell className="text-center">
          {summary.avgDuration ? `${summary.avgDuration}分` : '-'}
        </TableCell>
        <TableCell className="text-center">
          {summary.avg30min !== null ? `${summary.avg30min}分` : '-'}
        </TableCell>
        <TableCell className="text-right text-blue-600">
          {compensationLabel}
        </TableCell>
      </TableRow>
      {isExpanded && summary.visits.length > 0 && (
        <TableRow>
          <TableCell colSpan={8} className="p-0 bg-muted/30">
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {summary.label}の入客一覧（{summary.visits.length}件）
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-1.5 pr-3">日付</th>
                      <th className="text-left py-1.5 pr-3">顧客名</th>
                      <th className="text-left py-1.5 pr-3">メニュー</th>
                      <th className="text-left py-1.5 pr-3">スタイル</th>
                      <th className="text-right py-1.5 pr-3">料金</th>
                      <th className="text-right py-1.5">施術時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.visits.map((v, i) => (
                      <tr key={i} className="border-b border-muted last:border-0">
                        <td className="py-1.5 pr-3 whitespace-nowrap">{formatDate(v.visit_date)}</td>
                        <td className="py-1.5 pr-3 font-medium">{v.customer_name}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{v.service_menu}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{v.style_name}</td>
                        <td className="py-1.5 pr-3 text-right">{formatCurrency(v.price)}</td>
                        <td className="py-1.5 text-right">
                          {v.duration ? `${v.duration}分` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
