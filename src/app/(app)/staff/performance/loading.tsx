import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function PerformanceLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />

      {/* 今月のKPI */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 60分基準 */}
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-36 mb-2" />
          <Skeleton className="h-9 w-24" />
        </CardContent>
      </Card>

      {/* 給与予測 */}
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-28 mb-2" />
          <Skeleton className="h-9 w-32" />
        </CardContent>
      </Card>

      {/* 月別実績テーブル */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
