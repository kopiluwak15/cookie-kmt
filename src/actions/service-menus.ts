'use server'

import { createClient } from '@/lib/supabase/server'
import { getCachedStaffInfo } from '@/lib/cached-auth'
import { revalidatePath } from 'next/cache'

const DEFAULT_MENUS = [
  { id: 'default-1', name: 'カット', category: 'カット', estimated_minutes: 30, default_price: null, display_order: 1, is_active: true, is_concept: false, created_at: '' },
  { id: 'default-2', name: 'ブラックカラー', category: 'カラー', estimated_minutes: 30, default_price: null, display_order: 2, is_active: true, is_concept: false, created_at: '' },
  { id: 'default-3', name: '髭脱毛', category: 'オプション', estimated_minutes: 15, default_price: null, display_order: 3, is_active: true, is_concept: false, created_at: '' },
  { id: 'default-4', name: '眉カット', category: '部分カット', estimated_minutes: 5, default_price: null, display_order: 4, is_active: true, is_concept: false, created_at: '' },
  { id: 'default-5', name: 'ヘッドスパ', category: 'ヘッドスパ', estimated_minutes: 10, default_price: null, display_order: 5, is_active: true, is_concept: false, created_at: '' },
]

// サービスメニュー全件取得
export async function getServiceMenus() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service_menus')
    .select('*')
    .order('display_order')

  if (error) {
    console.warn('service_menus テーブル未作成の可能性があります:', error.message)
    return DEFAULT_MENUS
  }
  return data
}

// 有効なサービスメニューのみ取得
export async function getActiveServiceMenus() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service_menus')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (error) {
    console.warn('service_menus テーブル未作成の可能性があります:', error.message)
    return DEFAULT_MENUS
  }
  return data
}

// サービスメニュー新規作成
export async function createServiceMenu(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const category = (formData.get('category') as string | null) || null
  const estimatedMinutes = Number(formData.get('estimated_minutes') || 60)
  const defaultPrice = formData.get('default_price')
    ? Number(formData.get('default_price'))
    : null

  if (!name) {
    throw new Error('メニュー名を入力してください')
  }

  const { error } = await supabase.from('service_menus').insert({
    name,
    category: category && category.trim() ? category.trim() : null,
    estimated_minutes: estimatedMinutes,
    default_price: defaultPrice,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/store-settings/menus')
}

// サービスメニュー更新
export async function updateServiceMenu(
  id: string,
  updates: {
    name?: string
    category?: string | null
    estimated_minutes?: number
    default_price?: number | null
    is_active?: boolean
    is_concept?: boolean
  }
) {
  // is_concept の変更はオーナーのみ許可（リピート分析の重要指標のため）
  if (updates.is_concept !== undefined) {
    const staff = await getCachedStaffInfo()
    const isOwner = !!(staff as unknown as Record<string, unknown> | null)?.is_owner
    if (!isOwner) {
      throw new Error('コンセプトメニューの変更はオーナーのみ実行できます')
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('service_menus')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/store-settings/menus')
}
