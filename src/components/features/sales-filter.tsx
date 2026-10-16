'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SalesFilterProps {
  staffList: string[]
  currentStaff: string
  /** 選択可能な年の配列（新しい順）。例: [2026, 2025, 2024] */
  years: number[]
  currentYear: number
  currentMonth: number
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function SalesFilter({
  staffList,
  currentStaff,
  years,
  currentYear,
  currentMonth,
}: SalesFilterProps) {
  const router = useRouter()

  function navigate(next: { year?: number; month?: number; staff?: string }) {
    const year = next.year ?? currentYear
    const month = next.month ?? currentMonth
    const staff = next.staff ?? currentStaff

    const params = new URLSearchParams()
    params.set('year', String(year))
    params.set('month', String(month))
    if (staff && staff !== 'all') params.set('staff', staff)

    router.push(`/admin/analytics/sales?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={String(currentYear)} onValueChange={(v) => navigate({ year: parseInt(v, 10) })}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}年
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(currentMonth)} onValueChange={(v) => navigate({ month: parseInt(v, 10) })}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {m}月
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentStaff || 'all'} onValueChange={(v) => navigate({ staff: v })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">お店全体</SelectItem>
          {staffList.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
