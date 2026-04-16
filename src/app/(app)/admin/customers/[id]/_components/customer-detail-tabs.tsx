'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MESSAGE_TYPE_LABELS } from '@/lib/constants'
import { DeleteVisitButton } from '@/components/features/delete-visit-button'
import { Sparkles } from 'lucide-react'
import type { CaseRecord } from '@/types'

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visits: any[]
  caseRecords: CaseRecord[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineHistory: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  karteIntakes: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conceptIntakes: any[]
  customerName: string
  isSupabaseConfigured: boolean
  /** 閲覧専用モード（削除ボタン非表示） */
  readOnly?: boolean
}

export function CustomerDetailTabs({
  visits,
  caseRecords,
  lineHistory,
  karteIntakes,
  conceptIntakes,
  customerName,
  isSupabaseConfigured,
  readOnly = false,
}: Props) {
  return (
    <Tabs defaultValue="visits" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="visits">施術履歴</TabsTrigger>
        <TabsTrigger value="karte">カルテ</TabsTrigger>
        <TabsTrigger value="cases">症例</TabsTrigger>
        <TabsTrigger value="line">LINE履歴</TabsTrigger>
      </TabsList>

      {/* 施術履歴 */}
      <TabsContent value="visits">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">施術履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>来店日</TableHead>
                    <TableHead>施術メニュー</TableHead>
                    <TableHead className="text-center">滞在時間</TableHead>
                    <TableHead className="text-center">60分基準</TableHead>
                    <TableHead className="text-right">料金</TableHead>
                    <TableHead>担当</TableHead>
                    <TableHead className="text-center">お礼LINE</TableHead>
                    {!readOnly && <TableHead className="text-center w-[60px]">削除</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.length > 0 ? (
                    visits.map((visit) => {
                      const dur =
                        visit.checkin_at && visit.checkout_at
                          ? Math.round(
                              (new Date(visit.checkout_at).getTime() -
                                new Date(visit.checkin_at).getTime()) /
                                60000
                            )
                          : null
                      const normalized30 =
                        visit.expected_duration_minutes && dur && dur > 0
                          ? Math.round(
                              (dur / visit.expected_duration_minutes) * 60 * 10
                            ) / 10
                          : null
                      return (
                        <TableRow key={visit.id}>
                          <TableCell>{visit.visit_date}</TableCell>
                          <TableCell>{visit.service_menu}</TableCell>
                          <TableCell className="text-center">
                            {dur && dur > 0 ? `${dur}分` : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {normalized30 !== null ? `${normalized30}分` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {visit.price != null
                              ? `¥${visit.price.toLocaleString()}`
                              : '-'}
                          </TableCell>
                          <TableCell>{visit.staff_name}</TableCell>
                          <TableCell className="text-center">
                            {visit.thank_you_sent ? (
                              <Badge variant="default">送信済</Badge>
                            ) : (
                              <Badge variant="secondary">未送信</Badge>
                            )}
                          </TableCell>
                          {!readOnly && (
                            <TableCell className="text-center">
                              {isSupabaseConfigured && (
                                <DeleteVisitButton
                                  visitId={visit.id}
                                  visitDate={visit.visit_date}
                                  customerName={customerName}
                                />
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={readOnly ? 7 : 8}
                        className="text-center py-4 text-muted-foreground"
                      >
                        施術履歴がありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* カルテ + お悩みアンケート */}
      <TabsContent value="karte">
        <div className="space-y-4">
          {/* カルテ (karte_intake) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">カルテ情報</CardTitle>
            </CardHeader>
            <CardContent>
              {karteIntakes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  カルテデータがありません
                </p>
              ) : (
                <div className="space-y-4">
                  {karteIntakes.map((k) => (
                    <div
                      key={k.id}
                      className="rounded-lg border p-4 space-y-2 text-sm"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>
                          {new Date(k.created_at).toLocaleDateString('ja-JP', {
                            timeZone: 'Asia/Tokyo',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {k.is_concept_session && (
                          <Badge variant="secondary" className="text-[10px]">
                            コンセプト
                          </Badge>
                        )}
                      </div>
                      {k.visit_route && (
                        <KarteLine label="来店経路" value={k.visit_route} />
                      )}
                      {k.todays_wish?.length > 0 && (
                        <KarteTags label="本日のご希望" tags={k.todays_wish} />
                      )}
                      {k.history?.length > 0 && (
                        <KarteTags label="施術履歴" tags={k.history} />
                      )}
                      {k.worries?.length > 0 && (
                        <KarteTags
                          label="お悩み"
                          tags={k.worries}
                          extra={k.worries_other}
                        />
                      )}
                      {k.reasons?.length > 0 && (
                        <KarteTags
                          label="来店理由"
                          tags={k.reasons}
                          extra={k.reasons_other}
                        />
                      )}
                      {k.stay_style && (
                        <KarteLine
                          label="なりたい印象"
                          value={k.stay_style_other || k.stay_style}
                        />
                      )}
                      {k.dislikes?.length > 0 && (
                        <KarteTags
                          label="苦手なこと"
                          tags={k.dislikes}
                          extra={k.dislikes_other}
                        />
                      )}
                      {k.spots?.length > 0 && (
                        <KarteTags label="気になる部位" tags={k.spots} />
                      )}
                      {k.selected_menus_text && (
                        <KarteLine
                          label="希望メニュー"
                          value={k.selected_menus_text}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* お悩みアンケート (concept_intake) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">お悩みアンケート</CardTitle>
            </CardHeader>
            <CardContent>
              {conceptIntakes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  お悩みアンケートのデータがありません
                </p>
              ) : (
                <div className="space-y-4">
                  {conceptIntakes.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border p-4 space-y-2 text-sm"
                    >
                      <div className="text-xs text-muted-foreground mb-2">
                        {new Date(c.created_at).toLocaleDateString('ja-JP', {
                          timeZone: 'Asia/Tokyo',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      {c.symptoms?.length > 0 && (
                        <KarteTags
                          label="症状"
                          tags={c.symptoms}
                          extra={c.symptoms_other}
                        />
                      )}
                      {c.life_impacts?.length > 0 && (
                        <KarteTags
                          label="生活への影響"
                          tags={c.life_impacts}
                          extra={c.life_other}
                        />
                      )}
                      {c.psychology?.length > 0 && (
                        <KarteTags label="心理状態" tags={c.psychology} />
                      )}
                      {c.past_experiences?.length > 0 && (
                        <KarteTags
                          label="過去の経験"
                          tags={c.past_experiences}
                        />
                      )}
                      {c.success_criteria?.length > 0 && (
                        <KarteTags
                          label="成功条件"
                          tags={c.success_criteria}
                          extra={c.success_free}
                        />
                      )}
                      {c.priorities?.length > 0 && (
                        <KarteTags label="優先順位" tags={c.priorities} />
                      )}
                      {c.worries_free && (
                        <KarteLine label="その他悩み" value={c.worries_free} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* 症例タイムライン */}
      <TabsContent value="cases">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                症例タイムライン
                <Badge variant="secondary" className="text-xs">
                  {caseRecords.length}件
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                悩みに対してどんな施術をしたか、その記録とAIによる要点
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {caseRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                症例記録がありません。施術ログ入力時に「症例メモ」を入力すると蓄積されます。
              </p>
            ) : (
              <div className="space-y-4">
                {caseRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-lg border bg-muted/20 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {new Date(rec.created_at).toLocaleDateString('ja-JP', {
                          timeZone: 'Asia/Tokyo',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {rec.ai_model && (
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {rec.ai_model}
                        </span>
                      )}
                    </div>
                    {(rec.concern_tags.length > 0 || rec.concern_raw) && (
                      <div>
                        <div className="text-xs font-semibold text-blue-700 mb-1">
                          📋 現状
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {rec.concern_tags.map((t) => (
                            <span
                              key={t}
                              className="text-xs rounded-full bg-blue-100 text-blue-800 px-2 py-0.5"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        {rec.concern_raw && (
                          <p className="text-sm mt-1 text-gray-700">
                            {rec.concern_raw}
                          </p>
                        )}
                      </div>
                    )}
                    {(rec.treatment_tags.length > 0 || rec.treatment_raw) && (
                      <div>
                        <div className="text-xs font-semibold text-emerald-700 mb-1">
                          ✂️ 施術要点
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {rec.treatment_tags.map((t) => (
                            <span
                              key={t}
                              className="text-xs rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        {rec.treatment_raw && (
                          <p className="text-sm mt-1 text-gray-700">
                            {rec.treatment_raw}
                          </p>
                        )}
                      </div>
                    )}
                    {rec.counseling_notes && (
                      <div>
                        <div className="text-xs font-semibold text-purple-700 mb-1">
                          🗣️ カウンセリング
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {rec.counseling_notes}
                        </p>
                      </div>
                    )}
                    {rec.treatment_findings && (
                      <div>
                        <div className="text-xs font-semibold text-orange-700 mb-1">
                          🔍 施術での発見
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {rec.treatment_findings}
                        </p>
                      </div>
                    )}
                    {rec.next_proposal && (
                      <div>
                        <div className="text-xs font-semibold text-rose-700 mb-1">
                          📌 次回への提案
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {rec.next_proposal}
                        </p>
                      </div>
                    )}
                    {rec.ai_summary ? (
                      <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                        <div className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          AI 要約
                        </div>
                        <p className="text-sm text-amber-950 whitespace-pre-wrap leading-relaxed">
                          {rec.ai_summary}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        AI要約は生成中です
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* LINE送信履歴 */}
      <TabsContent value="line">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">LINE送信履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>送信日時</TableHead>
                  <TableHead>種類</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineHistory.length > 0 ? (
                  lineHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.sent_at).toLocaleString('ja-JP', {
                          timeZone: 'Asia/Tokyo',
                        })}
                      </TableCell>
                      <TableCell>
                        {MESSAGE_TYPE_LABELS[record.message_type] ||
                          record.message_type}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === 'sent'
                              ? 'default'
                              : record.status === 'blocked'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {record.status === 'sent'
                            ? '送信成功'
                            : record.status === 'blocked'
                            ? 'ブロック'
                            : '失敗'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-4 text-muted-foreground"
                    >
                      LINE送信履歴がありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function KarteLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">
        {label}：
      </span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

function KarteTags({
  label,
  tags,
  extra,
}: {
  label: string
  tags: string[]
  extra?: string | null
}) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">
        {label}：
      </span>
      <div className="flex flex-wrap gap-1 mt-0.5">
        {tags.map((t) => (
          <Badge key={t} variant="secondary" className="text-[10px] font-normal">
            {t}
          </Badge>
        ))}
        {extra && (
          <span className="text-xs text-muted-foreground">({extra})</span>
        )}
      </div>
    </div>
  )
}
