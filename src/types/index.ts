// ============================================
// アプリケーション型定義
// ============================================

export interface Store {
  id: string
  name: string
  store_code: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

// 雇用形態
export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contractor'] as const
export type EmploymentType = typeof EMPLOYMENT_TYPES[number]

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: '正社員',
  part_time: 'アルバイト・パート',
  contractor: '業務委託',
}

// 正社員ステージ
export const STAGES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] as const
export type Stage = typeof STAGES[number]

export interface StageDefinition {
  stage: Stage
  baseSalary: number
  laborCostRatio: number | null
  targetRevenue: number | null
  label: string
}

export const STAGE_DEFINITIONS: StageDefinition[] = [
  { stage: 'S1', baseSalary: 190000, laborCostRatio: 0.80, targetRevenue: 237500, label: '研修期間' },
  { stage: 'S2', baseSalary: 210000, laborCostRatio: 0.60, targetRevenue: 350000, label: '成長期間' },
  { stage: 'S3', baseSalary: 230000, laborCostRatio: 0.40, targetRevenue: 575000, label: '自立期間' },
  { stage: 'S4', baseSalary: 230000, laborCostRatio: null, targetRevenue: null, label: 'インセンティブ' },
  { stage: 'S5', baseSalary: 240000, laborCostRatio: null, targetRevenue: null, label: '役職' },
  { stage: 'S6', baseSalary: 0, laborCostRatio: null, targetRevenue: null, label: 'エリアMgr' },
]

export interface Staff {
  id: string
  auth_user_id: string
  email: string
  name: string
  role: 'admin' | 'staff'
  is_active: boolean
  line_user_id: string | null
  store_id: string | null
  must_change_password: boolean
  employment_type: EmploymentType | null
  stage: Stage | null
  base_salary: number | null
  hourly_rate: number | null
  commission_rate: number | null
  stage_started_at: string | null
  created_at: string
}

export interface StaffWithStore extends Staff {
  store?: Store | null
}

export interface Customer {
  id: string
  customer_code: string
  name: string
  name_kana: string | null
  line_user_id: string | null
  phone: string | null
  email: string | null
  birthday: string | null
  notes: string | null
  individual_cycle_days: number | null
  first_visit_date: string | null
  last_visit_date: string | null
  total_visits: number
  visit_motivation: string | null
  line_blocked: boolean
  line_friend_date: string | null
  created_at: string
  updated_at: string
}

export interface StyleSetting {
  id: string
  style_name: string
  base_cycle_days: number
  reminder1_days: number
  reminder2_days: number
  display_order: number
  is_active: boolean
  gender: 'male' | 'female' | 'unisex' | null
  created_at: string
}

export interface ServiceMenuItem {
  id: string
  name: string
  category: string | null
  estimated_minutes: number
  default_price: number | null
  display_order: number
  is_active: boolean
  is_concept: boolean
  created_at: string
}

export interface VisitHistory {
  id: string
  customer_id: string
  visit_date: string
  service_menu: string
  style_category_id: string | null
  staff_name: string
  visit_cycle_days: number | null
  notes: string | null
  thank_you_sent: boolean
  checkin_at: string | null
  checkout_at: string | null
  price: number | null
  expected_duration_minutes: number | null
  created_at: string
  // リレーション
  customer?: Customer
  style_settings?: StyleSetting
}

export interface CaseRecord {
  id: string
  visit_history_id: string
  customer_id: string
  concern_tags: string[]
  concern_raw: string | null
  treatment_tags: string[]
  treatment_raw: string | null
  counseling_notes: string | null
  treatment_findings: string | null
  next_proposal: string | null
  satisfaction_self: number | null
  ai_summary: string | null
  ai_model: string | null
  ai_summarized_at: string | null
  created_at: string
  updated_at: string
}

export interface LineMessageHistory {
  id: string
  customer_id: string
  visit_history_id: string | null
  message_type: 'thank_you' | 'thank_you_concept' | 'reminder1' | 'reminder2' | 'dormant' | 'custom' | 'maintenance_1' | 'maintenance_2'
  sent_at: string
  line_request_id: string | null
  status: 'sent' | 'failed' | 'blocked'
  error_message: string | null
}

export interface LineTemplateSetting {
  id: string
  template_type: 'thank_you' | 'thank_you_concept' | 'reminder1' | 'reminder2' | 'dormant' | 'maintenance_1' | 'maintenance_2'
  title: string
  body_text: string
  coupon_text: string | null
  booking_url: string | null
  is_active: boolean
  updated_at: string
}

export interface GlobalSetting {
  id: string
  key: string
  value: string
  updated_at: string
}

export interface ReservationHistory {
  id: string
  customer_id: string
  reserved_at: string
  visit_date: string | null
  status: 'reserved' | 'completed' | 'cancelled' | 'no_show'
  source: string | null
  created_at: string
}

// 来店動機選択肢
export const VISIT_MOTIVATIONS = [
  'Instagram',
  'Google検索・マップ',
  'ホットペッパー',
  '友人・知人の紹介',
  '看板・通りがかり',
  'その他',
] as const

export type VisitMotivation = typeof VISIT_MOTIVATIONS[number]

// 施術メニュー選択肢（レガシー: DB管理に移行済み）
export const SERVICE_MENUS = [
  'ツーブロック',
  '震災刈り',
  'マッシュ',
  'ウルフ',
  'ショート',
  'ミディアム',
  'フェード',
] as const

export type ServiceMenu = typeof SERVICE_MENUS[number]

// ============================================
// 労務管理システム型定義
// ============================================

// お知らせの重要度
export const ANNOUNCEMENT_IMPORTANCE_LEVELS = ['重要', '確認', '指示', 'お知らせ', 'その他'] as const
export type AnnouncementImportance = typeof ANNOUNCEMENT_IMPORTANCE_LEVELS[number]

export type DeliveryTiming = 'check_in' | 'check_out'

export interface AnnouncementTemplate {
  id: string
  title: string
  content: string
  delivery_timing: DeliveryTiming
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  importance: AnnouncementImportance
  delivery_timing: DeliveryTiming
  is_logged: boolean
  template_id: string | null
  created_by: string
  created_at: string
  is_active: boolean
}

export interface AnnouncementRecipient {
  id: string
  announcement_id: string
  staff_id: string
  sent_at: string
  created_at: string
}

export interface AnnouncementRead {
  id: string
  announcement_id: string
  staff_id: string
  confirmed_at: string
  created_at: string
}

export interface Attendance {
  id: string
  staff_id: string
  date: string
  checkin_time: string | null
  checkout_time: string | null
  created_at: string
  updated_at: string
}

export interface CheckoutChecklist {
  id: string
  staff_id: string
  date: string
  cleaned: boolean
  doors_locked: boolean
  inventory_checked: boolean
  register_checked: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface StaffRole {
  id: string
  staff_id: string
  role: string
  hourly_rate: number | null
  base_salary: number | null
  commission_rate: number | null
  created_at: string
  updated_at: string
}
