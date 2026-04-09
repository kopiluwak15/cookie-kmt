'use client'

import { useEffect, useState } from 'react'
import { getStaffListWithStore, registerStaff, updateStaff, toggleStaffActive, deleteStaff } from '@/actions/staff-management'
import { getStores } from '@/actions/store'
import { getLicenseUrl } from '@/actions/license'
import { verifyPassword } from '@/actions/verify-password'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { UserPlus, UserCog, Shield, ShieldCheck, Power, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import type { StaffWithStore, Store, EmploymentType, Stage } from '@/types'
import { STAGE_DEFINITIONS } from '@/types'
import { getStageDefaults } from '@/lib/salary-calculator'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// ステージ統合値: S1〜S6 + アルバイト + 業務委託
type StaffGrade = Stage | 'part_time' | 'contractor'

const GRADE_OPTIONS: { value: StaffGrade; label: string; description?: string }[] = [
  { value: 'S1', label: 'S1 - 研修期間', description: '基本給 ¥190,000' },
  { value: 'S2', label: 'S2 - 成長期間', description: '基本給 ¥210,000' },
  { value: 'S3', label: 'S3 - 自立期間', description: '基本給 ¥230,000' },
  { value: 'S4', label: 'S4 - インセンティブ', description: '基本給 ¥230,000' },
  { value: 'S5', label: 'S5 - 役職', description: '基本給 ¥240,000' },
  { value: 'S6', label: 'S6 - エリアMgr' },
  { value: 'part_time', label: 'アルバイト・パート' },
  { value: 'contractor', label: '業務委託' },
]

// グレード値から employment_type / stage を分解
function gradeToFields(grade: StaffGrade | null): { employmentType: EmploymentType | null; stage: Stage | null } {
  if (!grade) return { employmentType: null, stage: null }
  if (grade === 'part_time') return { employmentType: 'part_time', stage: null }
  if (grade === 'contractor') return { employmentType: 'contractor', stage: null }
  return { employmentType: 'full_time', stage: grade as Stage }
}

// employment_type + stage からグレード値に変換
function fieldsToGrade(employmentType: EmploymentType | null, stage: Stage | null): StaffGrade | null {
  if (employmentType === 'part_time') return 'part_time'
  if (employmentType === 'contractor') return 'contractor'
  if (employmentType === 'full_time' && stage) return stage
  return null
}

function getDemoStaff(): StaffWithStore[] {
  return [
    {
      id: 'demo-1', auth_user_id: 'au-1', email: 'admin@cookie-for-men.com',
      name: '田中 管理者', role: 'admin', is_active: true, store_id: null,
      store: null, line_user_id: null, must_change_password: false, created_at: '2024-01-01T00:00:00Z',
      employment_type: 'full_time', stage: 'S5', base_salary: 240000, hourly_rate: null, commission_rate: null, stage_started_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'demo-2', auth_user_id: 'au-2', email: 'yamada@cookie-for-men.com',
      name: '山田 太郎', role: 'staff', is_active: true, store_id: 'demo-store-1',
      store: { id: 'demo-store-1', name: '渋谷店', store_code: 'SHIBUYA', address: '東京都渋谷区', phone: '03-1234-5678', is_active: true, created_at: '2024-01-01T00:00:00Z' },
      line_user_id: 'U001', must_change_password: false, created_at: '2024-06-01T00:00:00Z',
      employment_type: 'contractor', stage: null, base_salary: null, hourly_rate: null, commission_rate: 0.4, stage_started_at: null,
    },
    {
      id: 'demo-3', auth_user_id: 'au-3', email: 'sasaki@cookie-for-men.com',
      name: '佐々木 花子', role: 'staff', is_active: false, store_id: 'demo-store-1',
      store: { id: 'demo-store-1', name: '渋谷店', store_code: 'SHIBUYA', address: '東京都渋谷区', phone: '03-1234-5678', is_active: true, created_at: '2024-01-01T00:00:00Z' },
      line_user_id: null, must_change_password: false, created_at: '2024-08-01T00:00:00Z',
      employment_type: 'part_time', stage: null, base_salary: null, hourly_rate: 1300, commission_rate: null, stage_started_at: null,
    },
  ]
}

function getDemoStores(): Store[] {
  return [
    { id: 'demo-store-1', name: '渋谷店', store_code: 'SHIBUYA', address: '東京都渋谷区', phone: '03-1234-5678', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  ]
}

// ステージ/雇用形態バッジ（一覧テーブル用）
function GradeBadge({ employmentType, stage }: { employmentType: EmploymentType | null; stage: Stage | null }) {
  if (employmentType === 'full_time' && stage) {
    const def = STAGE_DEFINITIONS.find(s => s.stage === stage)
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        {stage}{def && <span className="ml-1 font-normal">{def.label}</span>}
      </Badge>
    )
  }
  if (employmentType === 'part_time') {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">アルバイト</Badge>
  }
  if (employmentType === 'contractor') {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">業務委託</Badge>
  }
  return <span className="text-sm text-muted-foreground">-</span>
}

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<StaffWithStore[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 新規登録フォーム
  const [regRole, setRegRole] = useState<'admin' | 'staff'>('staff')
  const [regGrade, setRegGrade] = useState<StaffGrade | null>(null)
  const [regBaseSalary, setRegBaseSalary] = useState('')
  const [regHourlyRate, setRegHourlyRate] = useState('')
  const [regCommissionRate, setRegCommissionRate] = useState('')

  // 免許画像ダイアログ
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false)
  const [licenseImageUrl, setLicenseImageUrl] = useState<string | null>(null)
  const [licenseStaffName, setLicenseStaffName] = useState('')
  const [licenseLoading, setLicenseLoading] = useState(false)

  // 編集ダイアログ
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StaffWithStore | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<'admin' | 'staff'>('staff')
  const [editStoreId, setEditStoreId] = useState<string>('')
  const [editGrade, setEditGrade] = useState<StaffGrade | null>(null)
  const [editBaseSalary, setEditBaseSalary] = useState('')
  const [editHourlyRate, setEditHourlyRate] = useState('')
  const [editCommissionRate, setEditCommissionRate] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  // 削除確認
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    if (!isSupabaseConfigured) {
      setStaffList(getDemoStaff())
      setStores(getDemoStores())
      return
    }
    try {
      const [staffData, storeData] = await Promise.all([
        getStaffListWithStore(),
        getStores(),
      ])
      setStaffList(staffData as StaffWithStore[])
      setStores(storeData as Store[])
    } catch (err) {
      toast.error('データの取得に失敗しました')
      console.error(err)
    }
  }

  // 新規登録: グレード選択時
  function handleRegGradeChange(grade: StaffGrade) {
    setRegGrade(grade)
    // デフォルト値を自動セット
    if (['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].includes(grade)) {
      const defaults = getStageDefaults(grade as Stage)
      setRegBaseSalary(String(defaults.baseSalary))
      setRegHourlyRate('')
      setRegCommissionRate('')
    } else if (grade === 'part_time') {
      setRegBaseSalary('')
      setRegHourlyRate('1200')
      setRegCommissionRate('')
    } else if (grade === 'contractor') {
      setRegBaseSalary('')
      setRegHourlyRate('')
      setRegCommissionRate('40')
    }
  }

  async function handleRegister(formData: FormData) {
    setSubmitting(true)
    try {
      // roleをセット
      formData.set('role', regRole)

      // グレードから employment_type / stage を分解してセット
      const { employmentType, stage } = gradeToFields(regGrade)
      if (employmentType) formData.set('employment_type', employmentType)
      if (stage) formData.set('stage', stage)
      if (regBaseSalary) formData.set('base_salary', regBaseSalary)
      if (regHourlyRate) formData.set('hourly_rate', regHourlyRate)
      if (regCommissionRate) formData.set('commission_rate', String(parseFloat(regCommissionRate) / 100))

      if (!isSupabaseConfigured) {
        toast.success('（デモ）スタッフが登録されました')
        setDialogOpen(false)
        resetRegForm()
        setSubmitting(false)
        return
      }

      const result = await registerStaff(formData)
      if (result?.error) {
        toast.error(result.error)
        setSubmitting(false)
        return
      }
      toast.success('スタッフが登録されました')
      setDialogOpen(false)
      resetRegForm()
      await loadData()
    } catch {
      toast.error('登録中にエラーが発生しました')
    }
    setSubmitting(false)
  }

  function resetRegForm() {
    setRegRole('staff')
    setRegGrade(null)
    setRegBaseSalary('')
    setRegHourlyRate('')
    setRegCommissionRate('')
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    if (!isSupabaseConfigured) {
      toast.success(`（デモ）スタッフを${currentActive ? '無効' : '有効'}にしました`)
      return
    }
    try {
      await toggleStaffActive(id, !currentActive)
      toast.success(`スタッフを${currentActive ? '無効' : '有効'}にしました`)
      await loadData()
    } catch {
      toast.error('更新に失敗しました')
    }
  }

  async function handleViewLicense(staffId: string, staffName: string) {
    setLicenseStaffName(staffName)
    setLicenseImageUrl(null)
    setLicenseDialogOpen(true)
    setLicenseLoading(true)
    try {
      const url = await getLicenseUrl(staffId)
      setLicenseImageUrl(url)
    } finally {
      setLicenseLoading(false)
    }
  }

  function openEditDialog(staff: StaffWithStore) {
    setEditTarget(staff)
    setEditName(staff.name)
    setEditRole(staff.role as 'admin' | 'staff')
    setEditStoreId(staff.store_id || '')
    setEditGrade(fieldsToGrade(staff.employment_type, staff.stage))
    setEditBaseSalary(staff.base_salary ? String(staff.base_salary) : '')
    setEditHourlyRate(staff.hourly_rate ? String(staff.hourly_rate) : '')
    setEditCommissionRate(staff.commission_rate ? String(Number(staff.commission_rate) * 100) : '')
    setDeletePassword('')
    setDeleteError(null)
    setDeleteConfirmOpen(false)
    setEditDialogOpen(true)
  }

  // 編集: グレード変更時
  function handleEditGradeChange(grade: StaffGrade) {
    setEditGrade(grade)
    if (['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].includes(grade)) {
      const defaults = getStageDefaults(grade as Stage)
      setEditBaseSalary(String(defaults.baseSalary))
      setEditHourlyRate('')
      setEditCommissionRate('')
    } else if (grade === 'part_time') {
      setEditBaseSalary('')
      setEditHourlyRate('1200')
      setEditCommissionRate('')
    } else if (grade === 'contractor') {
      setEditBaseSalary('')
      setEditHourlyRate('')
      setEditCommissionRate('40')
    }
  }

  async function handleEditSubmit() {
    if (!editTarget) return
    setEditSubmitting(true)
    try {
      if (!isSupabaseConfigured) {
        toast.success('（デモ）スタッフ情報を更新しました')
        setEditDialogOpen(false)
        setEditSubmitting(false)
        return
      }

      const { employmentType, stage } = gradeToFields(editGrade)
      await updateStaff(editTarget.id, {
        name: editName,
        role: editRole,
        store_id: editStoreId || null,
        employment_type: employmentType,
        stage: stage,
        base_salary: editBaseSalary ? parseInt(editBaseSalary, 10) : null,
        hourly_rate: editHourlyRate ? parseInt(editHourlyRate, 10) : null,
        commission_rate: editCommissionRate ? parseFloat(editCommissionRate) / 100 : null,
      })
      toast.success('スタッフ情報を更新しました')
      setEditDialogOpen(false)
      await loadData()
    } catch {
      toast.error('更新に失敗しました')
    }
    setEditSubmitting(false)
  }

  async function handleDelete() {
    if (!editTarget) return
    if (!deletePassword) {
      setDeleteError('パスワードを入力してください')
      return
    }

    setDeleteSubmitting(true)
    setDeleteError(null)
    try {
      if (!isSupabaseConfigured) {
        toast.success('（デモ）スタッフを削除しました')
        setDeleteConfirmOpen(false)
        setEditDialogOpen(false)
        setDeleteSubmitting(false)
        return
      }

      // パスワード検証
      const pwResult = await verifyPassword(deletePassword)
      if (!pwResult.valid) {
        setDeleteError(pwResult.error || 'パスワードが正しくありません')
        setDeleteSubmitting(false)
        return
      }

      const result = await deleteStaff(editTarget.id)
      if (result?.error) {
        setDeleteError(result.error)
        setDeleteSubmitting(false)
        return
      }
      toast.success('スタッフを削除しました')
      setDeleteConfirmOpen(false)
      setDeletePassword('')
      setEditDialogOpen(false)
      await loadData()
    } catch {
      toast.error('削除に失敗しました')
    }
    setDeleteSubmitting(false)
  }

  // 権限フィルタ（デフォルト: スタッフ）
  const [roleFilter, setRoleFilter] = useState<'staff' | 'admin' | 'all'>('staff')

  const filteredStaffList = staffList.filter(s => {
    if (roleFilter === 'all') return true
    return s.role === roleFilter
  })

  const activeCount = staffList.filter(s => s.is_active).length
  const adminCount = staffList.filter(s => s.role === 'admin').length
  const staffCount = staffList.filter(s => s.role === 'staff').length

  // グレードの種別判定
  const isStageGrade = (g: StaffGrade | null) => g && ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].includes(g)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            スタッフ管理
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            スタッフの登録・管理を行います
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetRegForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-gray-900 hover:bg-gray-800">
              <UserPlus className="h-4 w-4 mr-2" />
              新規スタッフ登録
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>新規スタッフ登録</DialogTitle>
            </DialogHeader>
            <form action={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">氏名 *</Label>
                <Input id="name" name="name" required placeholder="山田 太郎" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス *</Label>
                <Input id="email" name="email" type="email" required placeholder="yamada@cookie-for-men.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">初期パスワード *</Label>
                <Input id="password" name="password" type="password" required minLength={6} placeholder="6文字以上" />
              </div>

              <div className="space-y-2">
                <Label>権限 *</Label>
                <Select value={regRole} onValueChange={(v) => setRegRole(v as 'admin' | 'staff')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">スタッフ</SelectItem>
                    <SelectItem value="admin">管理者</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* スタッフ選択時: ステージ/雇用形態を表示 */}
              {regRole === 'staff' && (
                <>
                  <div className="space-y-2">
                    <Label>ステージ *</Label>
                    <Select
                      value={regGrade || ''}
                      onValueChange={(v) => handleRegGradeChange(v as StaffGrade)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* S1〜S6: 基本給 */}
                  {isStageGrade(regGrade) && (
                    <div className="space-y-2">
                      <Label>基本給（円）</Label>
                      <Input
                        type="number"
                        value={regBaseSalary}
                        onChange={(e) => setRegBaseSalary(e.target.value)}
                        placeholder="190000"
                      />
                    </div>
                  )}

                  {/* アルバイト: 時給 */}
                  {regGrade === 'part_time' && (
                    <div className="space-y-2">
                      <Label>時給（円）</Label>
                      <Input
                        type="number"
                        value={regHourlyRate}
                        onChange={(e) => setRegHourlyRate(e.target.value)}
                        placeholder="1200"
                      />
                      <p className="text-xs text-muted-foreground">¥1,200〜¥1,500</p>
                    </div>
                  )}

                  {/* 業務委託: 歩合率 */}
                  {regGrade === 'contractor' && (
                    <div className="space-y-2">
                      <Label>歩合率（%）</Label>
                      <Input
                        type="number"
                        value={regCommissionRate}
                        onChange={(e) => setRegCommissionRate(e.target.value)}
                        placeholder="40"
                        step="1"
                      />
                      <p className="text-xs text-muted-foreground">税抜売上の%（源泉10.21%は別途控除）</p>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label>所属店舗</Label>
                <Select name="store_id">
                  <SelectTrigger>
                    <SelectValue placeholder="未割り当て" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}（{store.store_code}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetRegForm() }}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={submitting} className="bg-gray-900 hover:bg-gray-800">
                  {submitting ? '登録中...' : '登録する'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">総スタッフ数</p>
            <p className="text-2xl font-bold">{staffList.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">有効スタッフ</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">管理者数</p>
            <p className="text-2xl font-bold text-blue-600">{adminCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* スタッフ一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>スタッフ一覧</CardTitle>
            <div className="flex rounded-lg border overflow-hidden">
              <button
                onClick={() => setRoleFilter('staff')}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  roleFilter === 'staff'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                スタッフ ({staffCount})
              </button>
              <button
                onClick={() => setRoleFilter('admin')}
                className={`px-4 py-1.5 text-sm font-medium transition-colors border-l ${
                  roleFilter === 'admin'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                管理者 ({adminCount})
              </button>
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-4 py-1.5 text-sm font-medium transition-colors border-l ${
                  roleFilter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                全員 ({staffList.length})
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>氏名</TableHead>
                <TableHead>ステージ</TableHead>
                <TableHead>権限</TableHead>
                <TableHead>所属店舗</TableHead>
                <TableHead>LINE</TableHead>
                <TableHead>免許</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaffList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {roleFilter === 'all' ? 'スタッフが登録されていません' : `${roleFilter === 'staff' ? 'スタッフ' : '管理者'}が登録されていません`}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaffList.map((staff) => (
                  <TableRow key={staff.id} className={!staff.is_active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{staff.name}</TableCell>
                    <TableCell>
                      {staff.role === 'admin' ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <GradeBadge employmentType={staff.employment_type} stage={staff.stage} />
                      )}
                    </TableCell>
                    <TableCell>
                      {staff.role === 'admin' ? (
                        <Badge variant="default" className="bg-blue-600">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          管理者
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Shield className="h-3 w-3 mr-1" />
                          スタッフ
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {staff.store ? (
                        <span className="text-sm">{staff.store.name}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">未割り当て</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {staff.line_user_id ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">連携済</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(staff as unknown as Record<string, unknown>).license_image_path ? (
                        <button
                          type="button"
                          onClick={() => handleViewLicense(staff.id, staff.name)}
                          className="cursor-pointer"
                        >
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 transition-colors">
                            提出済
                          </Badge>
                        </button>
                      ) : staff.employment_type === 'contractor' ? (
                        <Badge variant="outline" className="text-red-500 border-red-300">未提出</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {staff.is_active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">有効</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500">無効</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(staff)}
                        title="編集"
                      >
                        <Pencil className="h-4 w-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(staff.id, staff.is_active)}
                        title={staff.is_active ? '無効にする' : '有効にする'}
                      >
                        <Power className={`h-4 w-4 ${staff.is_active ? 'text-red-500' : 'text-green-500'}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 編集ダイアログ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>スタッフ編集</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>氏名</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>メールアドレス</Label>
                <Input value={editTarget.email} disabled className="bg-gray-50" />
                <p className="text-xs text-muted-foreground">メールアドレスは変更できません</p>
              </div>

              <div className="space-y-2">
                <Label>権限</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as 'admin' | 'staff')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">スタッフ</SelectItem>
                    <SelectItem value="admin">管理者</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* スタッフ選択時: ステージ/雇用形態 */}
              {editRole === 'staff' && (
                <>
                  <div className="space-y-2">
                    <Label>ステージ</Label>
                    <Select
                      value={editGrade || ''}
                      onValueChange={(v) => handleEditGradeChange(v as StaffGrade)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isStageGrade(editGrade) && (
                    <div className="space-y-2">
                      <Label>基本給（円）</Label>
                      <Input
                        type="number"
                        value={editBaseSalary}
                        onChange={(e) => setEditBaseSalary(e.target.value)}
                      />
                    </div>
                  )}

                  {editGrade === 'part_time' && (
                    <div className="space-y-2">
                      <Label>時給（円）</Label>
                      <Input
                        type="number"
                        value={editHourlyRate}
                        onChange={(e) => setEditHourlyRate(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">¥1,200〜¥1,500</p>
                    </div>
                  )}

                  {editGrade === 'contractor' && (
                    <div className="space-y-2">
                      <Label>歩合率（%）</Label>
                      <Input
                        type="number"
                        value={editCommissionRate}
                        onChange={(e) => setEditCommissionRate(e.target.value)}
                        step="1"
                      />
                      <p className="text-xs text-muted-foreground">税抜売上の%（源泉10.21%は別途控除）</p>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label>所属店舗</Label>
                <Select value={editStoreId} onValueChange={setEditStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="未割り当て" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未割り当て</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}（{store.store_code}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between items-center pt-2">
                {/* 削除ボタン */}
                {!deleteConfirmOpen ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    削除
                  </Button>
                ) : (
                  <div className="space-y-2 w-full">
                    <div className="flex items-center gap-1.5 text-red-600 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      パスワードを入力して削除を確認
                    </div>
                    <Input
                      type="password"
                      placeholder="ログインパスワード"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !deleteSubmitting) handleDelete() }}
                    />
                    {deleteError && (
                      <p className="text-xs text-red-600">{deleteError}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleteSubmitting || !deletePassword}
                      >
                        {deleteSubmitting ? '確認中...' : '削除する'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setDeleteConfirmOpen(false); setDeletePassword(''); setDeleteError(null) }}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                )}

                {/* 保存・キャンセル */}
                {!deleteConfirmOpen && (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleEditSubmit}
                      disabled={editSubmitting || !editName.trim()}
                      className="bg-gray-900 hover:bg-gray-800"
                    >
                      {editSubmitting ? '保存中...' : '保存'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 免許画像ダイアログ */}
      <Dialog open={licenseDialogOpen} onOpenChange={setLicenseDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{licenseStaffName}の美容師免許</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {licenseLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                読み込み中...
              </div>
            ) : licenseImageUrl ? (
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={licenseImageUrl}
                  alt={`${licenseStaffName}の美容師免許`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                画像を取得できませんでした
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
