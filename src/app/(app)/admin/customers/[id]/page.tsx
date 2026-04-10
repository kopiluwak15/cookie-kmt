import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DeleteCustomerButton } from '@/components/features/delete-customer-button'
import { EditCustomerButton } from '@/components/features/edit-customer-button'
import { CustomerDetailTabs } from './_components/customer-detail-tabs'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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

  // カルテ・お悩みアンケート取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let karteIntakes: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let conceptIntakes: any[] = []
  if (isSupabaseConfigured) {
    const supabase = await createClient()
    const { data: ki } = await supabase
      .from('karte_intake')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(10)
    karteIntakes = ki || []
    const { data: ci } = await supabase
      .from('concept_intake')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(10)
    conceptIntakes = ci || []
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

      <CustomerDetailTabs
        visits={visits || []}
        caseRecords={caseRecords}
        lineHistory={lineHistory || []}
        karteIntakes={karteIntakes}
        conceptIntakes={conceptIntakes}
        customerName={customer.name}
        isSupabaseConfigured={isSupabaseConfigured}
      />
    </div>
  )
}
