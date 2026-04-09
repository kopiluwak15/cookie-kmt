import { getStyles, getActiveServiceMenus } from '@/actions/visit-log'
import { getCachedStaffInfo } from '@/lib/cached-auth'
import { VisitLogForm } from '@/components/features/visit-log-form'
import { redirect } from 'next/navigation'
import type { StyleSetting } from '@/types'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const demoStyles: StyleSetting[] = [
  { id: '1', style_name: 'ツーブロック', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 1, is_active: true, gender: 'male', created_at: '' },
  { id: '2', style_name: '震災刈り', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 2, is_active: true, gender: 'male', created_at: '' },
  { id: '3', style_name: 'マッシュ', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 3, is_active: true, gender: 'male', created_at: '' },
  { id: '4', style_name: 'ウルフ', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 4, is_active: true, gender: 'male', created_at: '' },
  { id: '5', style_name: 'ショート', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 5, is_active: true, gender: 'male', created_at: '' },
  { id: '6', style_name: 'ミディアム', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 6, is_active: true, gender: 'male', created_at: '' },
  { id: '7', style_name: 'フェード', base_cycle_days: 30, reminder1_days: 25, reminder2_days: 40, display_order: 7, is_active: true, gender: 'male', created_at: '' },
]

const demoServiceMenus = [
  { id: 's1', name: '縮毛矯正', category: 'ストレート・縮毛矯正', estimated_minutes: 180, default_price: 8000, display_order: 1, is_active: true, is_concept: true, created_at: '' },
  { id: 's2', name: 'モイスチャートリートメント', category: 'トリートメント', estimated_minutes: 30, default_price: 8000, display_order: 2, is_active: true, is_concept: true, created_at: '' },
  { id: 's3', name: 'カット(一般)', category: 'カット', estimated_minutes: 30, default_price: 4500, display_order: 3, is_active: true, is_concept: false, created_at: '' },
  { id: 's4', name: 'ジュエルカラー', category: 'カラー', estimated_minutes: 60, default_price: 5500, display_order: 4, is_active: true, is_concept: false, created_at: '' },
  { id: 's5', name: '極上30分ヘッドスパ', category: 'ヘッドスパ', estimated_minutes: 30, default_price: 3000, display_order: 5, is_active: true, is_concept: false, created_at: '' },
]

export default async function VisitLogPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="py-4">
        <VisitLogForm
          styles={demoStyles}
          serviceMenus={demoServiceMenus}
          currentStaffName="デモユーザー"
        />
      </div>
    )
  }

  const [styles, serviceMenus, currentStaff] = await Promise.all([
    getStyles(),
    getActiveServiceMenus(),
    getCachedStaffInfo(),
  ])

  if (!currentStaff) redirect('/login')

  return (
    <div className="py-4">
      <VisitLogForm
        styles={styles}
        serviceMenus={serviceMenus}
        currentStaffName={currentStaff.name}
      />
    </div>
  )
}
