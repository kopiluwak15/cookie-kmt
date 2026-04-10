import { getStyles, getActiveServiceMenus } from '@/actions/visit-log'
import { getCachedStaffInfo } from '@/lib/cached-auth'
import { getActiveChemicalPresets } from '@/actions/chemical-presets'
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

const demoChemicalCategories = [
  { label: 'ストレート', items: ['酸性ストレート1液', 'アルカリ1液', 'チオ系1液', 'シス系1液', '2液(過酸化水素)', '2液(臭素酸)', 'GMT', 'スピエラ'] },
  { label: 'カラー', items: ['アルカリカラー', 'ノンジアミン', 'ヘアマニキュア', 'ブリーチ', 'オキシ3%', 'オキシ6%', 'オキシ9%'] },
  { label: 'パーマ', items: ['コスメパーマ液', 'チオ系パーマ', 'シス系パーマ', 'デジタルパーマ'] },
  { label: 'トリートメント', items: ['酸熱トリートメント', '水素トリートメント', 'ケラチン補修', '酵素クレンジング', 'TOKIOインカラミ', 'オージュア'] },
]

export default async function VisitLogPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="py-4">
        <VisitLogForm
          styles={demoStyles}
          serviceMenus={demoServiceMenus}
          currentStaffName="デモユーザー"
          chemicalCategories={demoChemicalCategories}
        />
      </div>
    )
  }

  const [styles, serviceMenus, currentStaff, chemicalPresets] = await Promise.all([
    getStyles(),
    getActiveServiceMenus(),
    getCachedStaffInfo(),
    getActiveChemicalPresets(),
  ])

  if (!currentStaff) redirect('/login')

  // プリセットをカテゴリ別にグルーピング
  const categoryMap = new Map<string, string[]>()
  for (const p of chemicalPresets) {
    const items = categoryMap.get(p.category) || []
    items.push(p.name)
    categoryMap.set(p.category, items)
  }
  const chemicalCategories = Array.from(categoryMap.entries()).map(([label, items]) => ({
    label,
    items,
  }))

  return (
    <div className="py-4">
      <VisitLogForm
        styles={styles}
        serviceMenus={serviceMenus}
        currentStaffName={currentStaff.name}
        chemicalCategories={chemicalCategories}
      />
    </div>
  )
}
