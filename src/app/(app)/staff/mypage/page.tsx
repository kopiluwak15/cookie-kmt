import { getCachedStaffInfo } from '@/lib/cached-auth'
import { getLicenseUrl } from '@/actions/license'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LicenseUpload } from '@/components/features/license-upload'
import {
  EMPLOYMENT_TYPE_LABELS,
  STAGE_DEFINITIONS,
  type EmploymentType,
  type Stage,
} from '@/types'
import { User, FileText, ShieldCheck, Camera } from 'lucide-react'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

function getStageBadgeClass(stage: Stage): string {
  switch (stage) {
    case 'S1': return 'bg-gray-500 text-white'
    case 'S2': return 'bg-green-600 text-white'
    case 'S3': return 'bg-blue-600 text-white'
    case 'S4': return 'bg-purple-600 text-white'
    case 'S5': return 'bg-amber-600 text-white'
    case 'S6': return 'bg-red-600 text-white'
  }
}

function getEmploymentBadgeClass(type: EmploymentType): string {
  switch (type) {
    case 'full_time': return 'bg-blue-100 text-blue-800'
    case 'part_time': return 'bg-green-100 text-green-800'
    case 'contractor': return 'bg-amber-100 text-amber-800'
  }
}

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`
}

export default async function MyPage() {
  let staffInfo: {
    id: string
    name: string
    email: string
    role: string
    employment_type: EmploymentType | null
    stage: Stage | null
    base_salary: number | null
    hourly_rate: number | null
    commission_rate: number | null
    store_id: string | null
    license_image_path: string | null
  }

  if (!isSupabaseConfigured) {
    staffInfo = {
      id: 'demo',
      name: 'デモユーザー',
      email: 'demo@example.com',
      role: 'staff',
      employment_type: 'contractor',
      stage: null,
      base_salary: null,
      hourly_rate: null,
      commission_rate: 0.4,
      store_id: null,
      license_image_path: null,
    }
  } else {
    const currentStaff = await getCachedStaffInfo()
    if (!currentStaff) redirect('/login')
    staffInfo = {
      id: currentStaff.id,
      name: currentStaff.name,
      email: currentStaff.email,
      role: currentStaff.role,
      employment_type: currentStaff.employment_type,
      stage: currentStaff.stage,
      base_salary: currentStaff.base_salary,
      hourly_rate: currentStaff.hourly_rate,
      commission_rate: currentStaff.commission_rate,
      store_id: currentStaff.store_id,
      license_image_path: (currentStaff as unknown as Record<string, unknown>).license_image_path as string | null ?? null,
    }
  }

  const employmentType = staffInfo.employment_type
  const stage = staffInfo.stage
  const stageDef = stage ? STAGE_DEFINITIONS.find(s => s.stage === stage) : null
  const isContractor = employmentType === 'contractor'

  // 美容師免許画像URL取得
  const licenseUrl = isContractor && isSupabaseConfigured && staffInfo.license_image_path
    ? await getLicenseUrl(staffInfo.id)
    : null
  const hasLicense = !!staffInfo.license_image_path

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-bold">マイページ</h2>
      </div>

      {/* プロフィール情報 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            基本情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">氏名</span>
              <span className="font-medium">{staffInfo.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">メールアドレス</span>
              <span className="text-sm">{staffInfo.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">雇用形態</span>
              {employmentType ? (
                <Badge className={getEmploymentBadgeClass(employmentType)}>
                  {EMPLOYMENT_TYPE_LABELS[employmentType]}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">未設定</span>
              )}
            </div>
            {stage && stageDef && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">ステージ</span>
                <Badge className={getStageBadgeClass(stage)}>
                  {stage} {stageDef.label}
                </Badge>
              </div>
            )}
            {isContractor && staffInfo.commission_rate && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">歩合率</span>
                <span className="font-medium">{Math.round(staffInfo.commission_rate * 100)}%</span>
              </div>
            )}
            {employmentType === 'full_time' && staffInfo.base_salary && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">基本給</span>
                <span className="font-medium">{formatCurrency(staffInfo.base_salary)}</span>
              </div>
            )}
            {employmentType === 'part_time' && staffInfo.hourly_rate && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">時給</span>
                <span className="font-medium">{formatCurrency(staffInfo.hourly_rate)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 業務委託向けセクション */}
      {isContractor && (
        <>
          {/* 業務委託契約書 */}
          <Card className="border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                業務委託契約書
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">契約書の署名状況</span>
                <Badge variant="outline" className="text-gray-500 border-gray-300">
                  未署名
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                業務委託契約書の内容を確認し、署名してください。
              </p>
            </CardContent>
          </Card>

          {/* ルールブック同意書 */}
          <Card className="border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                ルールブック同意書
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">同意状況</span>
                <Badge variant="outline" className="text-gray-500 border-gray-300">
                  未同意
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                サロンのルールブックを確認し、同意してください。
              </p>
            </CardContent>
          </Card>

          {/* 美容師免許 */}
          <Card className="border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5 text-amber-600" />
                美容師免許
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LicenseUpload currentImageUrl={licenseUrl} hasLicense={hasLicense} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
