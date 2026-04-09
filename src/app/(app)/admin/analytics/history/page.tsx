import { createClient } from '@/lib/supabase/server'
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
import Link from 'next/link'
import { EditVisitButton } from '@/components/features/edit-visit-button'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

function formatDuration(checkin: string | null, checkout: string | null): string {
  if (!checkin || !checkout) return '-'
  const diff = (new Date(checkout).getTime() - new Date(checkin).getTime()) / 60000
  if (diff <= 0) return '-'
  const h = Math.floor(diff / 60)
  const m = Math.round(diff % 60)
  return h > 0 ? `${h}h${m}m` : `${m}分`
}

function formatPrice(price: number | null): string {
  if (price == null) return '-'
  return `¥${price.toLocaleString()}`
}

function getDemoVisits() {
  return [
    { id: 'dv1', visit_date: '2025-12-22', customer_id: 'demo-7', customer: { customer_code: 'C-0007', name: '山本 悠真' }, service_menu: 'カット, ブラックカラー', style_settings: { style_name: 'フェード' }, staff_name: '山田', thank_you_sent: true, checkin_at: '2025-12-22T10:00:00', checkout_at: '2025-12-22T10:56:00', price: 4500, expected_duration_minutes: 60 },
    { id: 'dv2', visit_date: '2025-12-20', customer_id: 'demo-1', customer: { customer_code: 'C-0001', name: '田中 太郎' }, service_menu: 'カット', style_settings: { style_name: 'ツーブロック' }, staff_name: '山田', thank_you_sent: true, checkin_at: '2025-12-20T13:00:00', checkout_at: '2025-12-20T13:28:00', price: 4500, expected_duration_minutes: 30 },
    { id: 'dv3', visit_date: '2025-12-18', customer_id: 'demo-2', customer: { customer_code: 'C-0002', name: '佐藤 健一' }, service_menu: 'カット, 眉カット', style_settings: { style_name: 'マッシュ' }, staff_name: '佐々木', thank_you_sent: true, checkin_at: '2025-12-18T14:30:00', checkout_at: '2025-12-18T15:08:00', price: 5000, expected_duration_minutes: 35 },
    { id: 'dv4', visit_date: '2025-12-15', customer_id: 'demo-3', customer: { customer_code: 'C-0003', name: '鈴木 大輔' }, service_menu: 'カット', style_settings: { style_name: 'ショート' }, staff_name: '山田', thank_you_sent: false, checkin_at: '2025-12-15T11:00:00', checkout_at: '2025-12-15T11:27:00', price: 4000, expected_duration_minutes: 30 },
    { id: 'dv5', visit_date: '2025-12-10', customer_id: 'demo-5', customer: { customer_code: 'C-0005', name: '伊藤 拓海' }, service_menu: 'カット, ヘッドスパ', style_settings: { style_name: 'ウルフ' }, staff_name: '佐々木', thank_you_sent: true, checkin_at: '2025-12-10T16:00:00', checkout_at: '2025-12-10T16:38:00', price: 5500, expected_duration_minutes: 40 },
  ]
}

export default async function VisitHistoryPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let visits: any[] | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let styles: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let serviceMenus: any[] = []

  if (!isSupabaseConfigured) {
    visits = getDemoVisits()
  } else {
    const supabase = await createClient()

    // 施術履歴・スタイル・メニューを並列取得
    const [visitsRes, stylesRes, menusRes] = await Promise.all([
      supabase
        .from('visit_history')
        .select('*, customer(customer_code, name), style_settings(style_name)')
        .order('visit_date', { ascending: false })
        .order('checkin_at', { ascending: false })
        .limit(100),
      supabase
        .from('style_settings')
        .select('*')
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('service_menus')
        .select('*')
        .eq('is_active', true)
        .order('display_order'),
    ])

    visits = visitsRes.data
    styles = stylesRes.data || []
    serviceMenus = menusRes.data || []
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">施術履歴</h2>

      {!isSupabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          デモモードで表示中です。Supabaseの認証情報を .env.local に設定すると実データが表示されます。
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">最近の施術履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>来店日</TableHead>
                  <TableHead>顧客</TableHead>
                  <TableHead>施術メニュー</TableHead>
                  <TableHead className="text-center">滞在時間</TableHead>
                  <TableHead className="text-center">60分基準</TableHead>
                  <TableHead className="text-right">料金</TableHead>
                  <TableHead>担当</TableHead>
                  <TableHead className="text-center">お礼LINE</TableHead>
                  <TableHead className="text-center w-[60px]">編集</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits && visits.length > 0 ? (
                  visits.map((visit) => {
                    const customer = visit.customer as { customer_code: string; name: string } | null

                    const dur = visit.checkin_at && visit.checkout_at
                      ? (new Date(visit.checkout_at).getTime() - new Date(visit.checkin_at).getTime()) / 60000
                      : null
                    const normalized30 = visit.expected_duration_minutes && dur && dur > 0
                      ? Math.round((dur / visit.expected_duration_minutes) * 60 * 10) / 10
                      : null

                    return (
                      <TableRow key={visit.id}>
                        <TableCell>{visit.visit_date}</TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/customers/${visit.customer_id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {customer?.customer_code} {customer?.name}
                          </Link>
                        </TableCell>
                        <TableCell>{visit.service_menu}</TableCell>
                        <TableCell className="text-center">
                          {formatDuration(visit.checkin_at, visit.checkout_at)}
                        </TableCell>
                        <TableCell className="text-center">
                          {normalized30 !== null ? `${normalized30}分` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(visit.price)}
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
                            <EditVisitButton
                              visitId={visit.id}
                              visitDate={visit.visit_date}
                              customerName={customer?.name}
                              styles={styles}
                              serviceMenus={serviceMenus}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      施術履歴がありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
