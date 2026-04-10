'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedStaffInfo } from '@/lib/cached-auth'
import { revalidatePath } from 'next/cache'

export interface ChemicalPreset {
  id: string
  category: string
  name: string
  display_order: number
  is_active: boolean
}

/** 有効な薬剤プリセットをカテゴリ順で取得 */
export async function getActiveChemicalPresets(): Promise<ChemicalPreset[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chemical_presets')
    .select('id, category, name, display_order, is_active')
    .eq('is_active', true)
    .order('category')
    .order('display_order')

  if (error) {
    console.error('[chemical_presets] fetch failed:', error.message)
    return []
  }
  return data as ChemicalPreset[]
}

/** 全件取得（管理画面用、非アクティブ含む） */
export async function getAllChemicalPresets(): Promise<ChemicalPreset[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chemical_presets')
    .select('id, category, name, display_order, is_active')
    .order('category')
    .order('display_order')

  if (error) {
    console.error('[chemical_presets] fetch all failed:', error.message)
    return []
  }
  return data as ChemicalPreset[]
}

/** 薬剤プリセットを追加 */
export async function addChemicalPreset(category: string, name: string) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const admin = createAdminClient()

  // 同カテゴリ内の最大 display_order を取得
  const { data: maxRow } = await admin
    .from('chemical_presets')
    .select('display_order')
    .eq('category', category)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxRow?.display_order ?? 0) + 1

  const { error } = await admin
    .from('chemical_presets')
    .insert({ category, name: name.trim(), display_order: nextOrder })

  if (error) {
    if (error.message.includes('chemical_presets_unique')) {
      return { error: '同じカテゴリに同じ名前の薬剤が既に存在します' }
    }
    return { error: `追加に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/settings/chemicals')
  revalidatePath('/staff/visit-log')
  return { success: true }
}

/** 薬剤プリセットを無効化（論理削除） */
export async function deleteChemicalPreset(id: string) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('chemical_presets')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return { error: `削除に失敗しました: ${error.message}` }

  revalidatePath('/admin/settings/chemicals')
  revalidatePath('/staff/visit-log')
  return { success: true }
}

/** 薬剤プリセットを再有効化 */
export async function restoreChemicalPreset(id: string) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('chemical_presets')
    .update({ is_active: true })
    .eq('id', id)

  if (error) return { error: `復元に失敗しました: ${error.message}` }

  revalidatePath('/admin/settings/chemicals')
  revalidatePath('/staff/visit-log')
  return { success: true }
}
