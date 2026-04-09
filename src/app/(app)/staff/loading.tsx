import { Card, CardContent } from '@/components/ui/card'

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className || ''}`} />
}

export default function StaffLoading() {
  return (
    <div className="space-y-6">
      {/* タイトル */}
      <SkeletonBlock className="h-8 w-48" />

      {/* KPIカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <SkeletonBlock className="h-4 w-20 mb-3" />
              <SkeletonBlock className="h-8 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* テーブル */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <SkeletonBlock className="h-4 w-32 mb-4" />
          {[...Array(5)].map((_, i) => (
            <SkeletonBlock key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
