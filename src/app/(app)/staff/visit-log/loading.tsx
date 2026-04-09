import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function VisitLogLoading() {
  return (
    <div className="py-4 space-y-6">
      {/* 顧客検索 */}
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      {/* スタイル選択 */}
      <div>
        <Skeleton className="h-5 w-28 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* サービスメニュー */}
      <div>
        <Skeleton className="h-5 w-36 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* ボタン */}
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  )
}
