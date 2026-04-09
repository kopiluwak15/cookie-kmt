'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getStyleSettings() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('style_settings')
    .select('*')
    .order('display_order')

  if (error) throw new Error(error.message)
  return data
}

export async function updateStyleSetting(
  id: string,
  updates: {
    style_name?: string
    base_cycle_days?: number
    reminder1_days?: number
    reminder2_days?: number
    is_active?: boolean
    gender?: 'male' | 'female' | 'unisex' | null
  }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('style_settings')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/store-settings/styles')
}

export async function createStyleSetting(formData: FormData) {
  const supabase = await createClient()

  const gender = (formData.get('gender') as string | null) || null
  const { error } = await supabase.from('style_settings').insert({
    style_name: formData.get('style_name') as string,
    base_cycle_days: Number(formData.get('base_cycle_days')),
    reminder1_days: Number(formData.get('reminder1_days')),
    reminder2_days: Number(formData.get('reminder2_days')),
    gender: gender && ['male', 'female', 'unisex'].includes(gender) ? gender : null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/store-settings/styles')
}
