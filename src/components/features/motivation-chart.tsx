'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getMotivationStats } from '@/actions/motivation-stats'

interface MotivationData {
  name: string
  value: number
}

interface MotivationChartProps {
  startDate: string
  endDate: string
}

export function MotivationChart({ startDate, endDate }: MotivationChartProps) {
  const [data, setData] = useState<MotivationData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getMotivationStats(startDate, endDate)
      setData(result)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">来店動機</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            読み込み中...
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            データがありません
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>来店経路</TableHead>
                <TableHead className="text-center">人数</TableHead>
                <TableHead className="text-center">割合</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.name}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-center">{item.value}人</TableCell>
                  <TableCell className="text-center">
                    {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '-'}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold">
                <TableCell>合計</TableCell>
                <TableCell className="text-center">{total}人</TableCell>
                <TableCell className="text-center">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
