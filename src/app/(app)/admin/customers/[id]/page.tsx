import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MESSAGE_TYPE_LABELS } from '@/lib/constants'
import { DeleteCustomerButton } from '@/components/features/delete-customer-button'
import { DeleteVisitButton } from '@/components/features/delete-visit-button'
import { EditCustomerButton } from '@/components/features/edit-customer-button'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import type { CaseRecord } from '@/types'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDemoCustomerData(id: string): { customer: any; visits: any[]; lineHistory: any[] } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const demoCustomers: Record<string, { customer: any; visits: any[]; lineHistory: any[] }> = {
    'demo-1': {
      customer: {
        id: 'demo-1', customer_code: 'C-0001', name: '田中 太郎', name_kana: 'タナカ タロウ',
        phone: '090-1234-5678', email: null, birthday: null,
        notes: 'サイドは短め希望。ジェルで仕上げ。',
        individual_cycle_days: 25, first_visit_date: '2024-03-15', last_visit_date: '2025-12-20',
        total_visits: 12, line_user_id: 'U001', line_blocked: false, line_friend_date: '2024-03-15',
        created_at: '2024-03-15T00:00:00Z', updated_at: '2025-12-20T00:00:00Z',
      },
      visits: [
        { id: 'v1', visit_date: '2025-12-20', service_menu: 'フェード', style_settings: { style_name: 'フェード' }, staff_name: '山田', thank_you_sent: true },
        { id: 'v2', visit_date: '2025-11-22', service_menu: 'ツーブロック', style_settings: { style_name: 'ツーブロック' }, staff_name: '山田', thank_you_sent: true },
        { id: 'v3', visit_date: '2025-10-25', service_menu: 'フェード', style_settings: { style_name: 'フェード' }, staff_name: '佐々木', thank_you_sent: true },
      ],
      lineHistory: [
        { id: 'lh1', sent_at: '2025-12-20T18:00:00Z', message_type: 'thank_you', status: 'sent' },
        { id: 'lh2', sent_at: '2025-12-10T10:00:00Z', message_type: 'reminder1', status: 'sent' },
        { id: 'lh3', sent_at: '2025-11-22T18:00:00Z', message_type: 'thank_you', status: 'sent' },
      ],
    },
  }

  // Return matching demo customer or a generic one for any unknown demo ID
  if (demoCustomers[id]) return demoCustomers[id]

  return {
    customer: {
      id, customer_code: 'C-DEMO', name: 'デモ顧客', name_kana: 'デモ コキャク',
      phone: '090-0000-0000', email: null, birthday: null, notes: null,
      individual_cycle_days: null, first_visit_date: '2025-01-10', last_visit_date: '2025-12-01',
      total_visits: 5, line_user_id: 'U999', line_blocked: false, line_friend_date: '2025-01-10',
      created_at: '2025-01-10T00:00:00Z', updated_at: '2025-12-01T00:00:00Z',
    },
    visits: [
      { id: 'vd1', visit_date: '2025-12-01', service_menu: 'ショート', style_settings: { style_name: 'ショート' }, staff_name: '山田', thank_you_sent: true },
      { id: 'vd2', visit_date: '2025-11-05', service_menu: 'ショート', style_settings: { style_name: 'ショート' }, staff_name: '山田', thank_you_sent: false },
    ],
    lineHistory: [
      { id: 'lhd1', sent_at: '2025-12-01T18:00:00Z', message_type: 'thank_you', status: 'sent' },
    ],
  }
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let customer: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let visits: any[] | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lineHistory: any[] | null
  let caseRecords: CaseRecord[] = []

  if (!isSupabaseConfigured) {
    const demo = getDemoCustomerData(id)
    customer = demo.customer
    visits = demo.visits
    lineHistory = demo.lineHistory
  } else {
    const supabase = await createClient()

    // 顧客情報
    const { data: customerData } = await supabase
      .from('customer')
      .select('*')
      .eq('id', id)
      .single()

    if (!customerData) notFound()
    customer = customerData

    // 施術履歴
    const { data: visitsData } = await supabase
      .from('visit_history')
      .select('*, style_settings(style_name), expected_duration_minutes')
      .eq('customer_id', id)
      .order('visit_date', { ascending: false })
      .limit(20)
    visits = visitsData

    // 症例記録（悩み × 施術要点 + AI要約）
    const { data: caseData } = await supabase
      .from('case_records')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(20)
    caseRecords = (caseData || []) as CaseRecord[]

    // LINE送信履歴
    const { data: lineData } = await supabase
      .from('line_message_history')
      .select('*')
      .eq('customer_id', id)
      .order('sent_at', { ascending: false })
      .limit(20)
    lineHistory = lineData
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/customers" className="text-muted-foreground hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h2 className="text-2xl font-bold">顧客カルテ</h2>
        </div>
        {isSupabaseConfigured && (
          <div className="flex items-center gap-2">
            <EditCustomerButton
              customer={{
                id: customer.id,
                name: customer.name,
                name_kana: customer.name_kana,
                phone: customer.phone,
                birth_month: customer.birthday ? new Date(customer.birthday).getMonth() + 1 : null,
                visit_motivation: customer.visit_motivation,
                individual_cycle_days: customer.individual_cycle_days,
                notes: customer.notes,
                first_visit_date: customer.first_visit_date || null,
                last_visit_date: customer.last_visit_date || null,
              }}
            />
            <DeleteCustomerButton customerId={customer.id} customerName={customer.name} />
          </div>
        )}
      </div>

      {!isSupabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          デモモードで表示中です。Supabaseの認証情報を .env.local に設定すると実データが表示されます。
        </div>
      )}

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span>{customer.customer_code}</span>
            <span>{customer.name}</span>
            {customer.line_user_id ? (
              customer.line_blocked ? (
                <Badge variant="destructive">LINEブロック</Badge>
              ) : (
                <Badge variant="default">LINE連携済</Badge>
              )
            ) : (
              <Badge variant="secondary">LINE未連携</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">フリガナ</span>
              <p className="font-medium">{customer.name_kana || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">電話番号</span>
              <p className="font-medium">{customer.phone || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">初回来店日</span>
              <p className="font-medium">{customer.first_visit_date || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">最終来店日</span>
              <p className="font-medium">{customer.last_visit_date || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">来店回数</span>
              <p className="font-medium">{customer.total_visits}回</p>
            </div>
            <div>
              <span className="text-muted-foreground">来店経路</span>
              <p className="font-medium">{customer.visit_motivation || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">誕生月</span>
              <p className="font-medium">{customer.birthday ? `${new Date(customer.birthday).getMonth() + 1}月` : '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">個別来店周期</span>
              <p className="font-medium">
                {customer.individual_cycle_days
                  ? `${customer.individual_cycle_days}日`
                  : '未設定（スタイル設定に従う）'}
              </p>
            </div>
          </div>
          {customer.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <span className="text-sm text-muted-foreground">メモ</span>
                <p className="text-sm mt-1">{customer.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 施術履歴 */}
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
                  <TableHead className="text-center w-[60px]">削除</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits && visits.length > 0 ? (
                  visits.map((visit) => {
                    const dur = visit.checkin_at && visit.checkout_at
                      ? Math.round((new Date(visit.checkout_at).getTime() - new Date(visit.checkin_at).getTime()) / 60000)
                      : null
                    const normalized30 = visit.expected_duration_minutes && dur && dur > 0
                      ? Math.round((dur / visit.expected_duration_minutes) * 60 * 10) / 10
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
                          {visit.price != null ? `¥${visit.price.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>{visit.staff_name}</TableCell>
                        <TableCell className="text-center">
                          {visit.thank_you_sent ? (
                            <Badge variant="default">送信済</Badge>
                          ) : (
                            <Badge variant="secondary">未送信</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isSupabaseConfigured && (
                            <DeleteVisitButton
                              visitId={visit.id}
                              visitDate={visit.visit_date}
                              customerName={customer.name}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                      施術履歴がありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 症例タイムライン（悩み × 施術 × AI要約） */}
      {isSupabaseConfigured && (
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

                    {/* 悩み */}
                    {(rec.concern_tags.length > 0 || rec.concern_raw) && (
                      <div>
                        <div className="text-xs font-semibold text-blue-700 mb-1">
                          💭 悩み
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
                          <p className="text-sm mt-1 text-gray-700">{rec.concern_raw}</p>
                        )}
                      </div>
                    )}

                    {/* 施術要点 */}
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
                          <p className="text-sm mt-1 text-gray-700">{rec.treatment_raw}</p>
                        )}
                      </div>
                    )}

                    {/* AI要約 */}
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
                        AI要約は生成中です（保存から数秒後に表示されます）
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* LINE送信履歴 */}
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
              {lineHistory && lineHistory.length > 0 ? (
                lineHistory.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {new Date(record.sent_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                    </TableCell>
                    <TableCell>
                      {MESSAGE_TYPE_LABELS[record.message_type] || record.message_type}
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
                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                    LINE送信履歴がありません
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
