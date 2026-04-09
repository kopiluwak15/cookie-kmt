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
}

export function SalesFilter({ staffList, currentStaff }: SalesFilterProps) {
  const router = useRouter()

  const handleChange = (value: string) => {
    if (value === 'all') {
      router.push('/admin/analytics/sales')
    } else {
      router.push(`/admin/analytics/sales?staff=${encodeURIComponent(value)}`)
    }
  }

  return (
    <Select value={currentStaff || 'all'} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
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
  )
}
