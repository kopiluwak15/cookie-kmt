import { getCaseStats, getConcernRepeatRates } from '@/actions/case-analysis'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Target, TrendingUp, Layers } from 'lucide-react'

// 症例データはリアルタイムで反映するためキャッシュ無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const AI_THRESHOLD = 100 // 100症例達成でAIアドバイス発動

export default async function CasesAnalyticsPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          デモモードでは症例分析は表示できません。
        </div>
      </div>
    )
  }

  const [stats, concernRepeat] = await Promise.all([
    getCaseStats(),
    getConcernRepeatRates(60),
  ])

  const progressPct = Math.min(100, Math.round((stats.total / AI_THRESHOLD) * 100))
  const remaining = Math.max(0, AI_THRESHOLD - stats.total)
  const aiCoverage =
    stats.total > 0 ? Math.round((stats.withAiSummary / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">症例分析</h2>
        <p className="text-xs text-muted-foreground">
          悩み → 施術 → リピート のパターンを蓄積
        </p>
      </div>

      {/* 症例蓄積ダッシュボード */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            症例蓄積ダッシュボード
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* メイン進捗バー */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-600">{stats.total}</span>
                <span className="text-sm text-muted-foreground">件 / {AI_THRESHOLD}件</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">
                  {remaining > 0
                    ? `AI提案発動まで あと${remaining}件`
                    : '✨ AI提案発動条件 達成'}
                </div>
                <div className="text-xs text-muted-foreground">
                  100症例達成で類似症例検索・提案が有効化
                </div>
              </div>
            </div>
            <div className="h-4 rounded-full bg-muted overflow-hidden">
              <div
                className={
                  progressPct >= 100
                    ? 'h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all'
                    : 'h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all'
                }
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* サブ指標3つ */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI要約カバレッジ
              </div>
              <div className="text-2xl font-bold mt-1">{aiCoverage}%</div>
              <div className="text-[10px] text-muted-foreground">
                {stats.withAiSummary} / {stats.total}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Layers className="h-3 w-3" />
                悩みタグ種類
              </div>
              <div className="text-2xl font-bold mt-1">{stats.concernRanking.length}</div>
              <div className="text-[10px] text-muted-foreground">
                上位12件まで表示
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                施術要点種類
              </div>
              <div className="text-2xl font-bold mt-1">{stats.treatmentRanking.length}</div>
              <div className="text-[10px] text-muted-foreground">
                上位12件まで表示
              </div>
            </div>
          </div>

          {stats.latestCreatedAt && (
            <div className="text-xs text-muted-foreground text-right">
              最終更新:{' '}
              {new Date(stats.latestCreatedAt).toLocaleString('ja-JP', {
                timeZone: 'Asia/Tokyo',
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 悩みタグ × リピート率 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">悩みタグ別リピート率</CardTitle>
            <p className="text-xs text-muted-foreground">
              症例保存後 {concernRepeat.thresholdDays}日以内の再来店を「リピート」と判定 / 母数 {concernRepeat.basisCases}件
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {concernRepeat.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              まだ症例データがありません。施術ログ入力時に「症例メモ」で悩みタグを選ぶと蓄積されます。
            </p>
          ) : (
            <div className="space-y-2">
              {concernRepeat.rows.map((row) => {
                const barColor =
                  row.repeatRate >= 70
                    ? 'bg-emerald-500'
                    : row.repeatRate >= 50
                      ? 'bg-blue-500'
                      : row.repeatRate >= 30
                        ? 'bg-amber-500'
                        : 'bg-red-400'
                return (
                  <div key={row.tag} className="flex items-center gap-3">
                    <div className="w-40 shrink-0 text-sm truncate">{row.tag}</div>
                    <div className="flex-1 h-7 rounded-md bg-muted overflow-hidden relative">
                      <div
                        className={`h-full ${barColor} transition-all`}
                        style={{ width: `${Math.max(2, row.repeatRate)}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-medium">
                        <span className="text-white drop-shadow">{row.repeatRate}%</span>
                        <span className="text-muted-foreground">
                          {row.repeated}/{row.cases}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 悩みタグ ランキング */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💭 悩みタグ ランキング</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.concernRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                データがありません
              </p>
            ) : (
              <div className="space-y-1.5">
                {stats.concernRanking.map((r, i) => (
                  <div key={r.tag} className="flex items-center gap-2">
                    <span className="w-5 text-xs text-muted-foreground text-right">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm truncate">{r.tag}</span>
                    <Badge variant="secondary">{r.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">✂️ 施術要点 ランキング</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.treatmentRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                データがありません
              </p>
            ) : (
              <div className="space-y-1.5">
                {stats.treatmentRanking.map((r, i) => (
                  <div key={r.tag} className="flex items-center gap-2">
                    <span className="w-5 text-xs text-muted-foreground text-right">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm truncate">{r.tag}</span>
                    <Badge variant="secondary">{r.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 悩み × 施術 ベスト組み合わせ */}
      {stats.topCombinations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🔗 悩み × 施術 頻出パターン TOP10</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {stats.topCombinations.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-xs text-muted-foreground text-right">
                    {i + 1}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs">
                    {c.concern}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs">
                    {c.treatment}
                  </span>
                  <span className="ml-auto">
                    <Badge variant="secondary">{c.count}件</Badge>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
