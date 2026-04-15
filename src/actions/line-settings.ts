'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getLineTemplates() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('line_template_settings')
    .select('*')
    .order('template_type')

  if (error) throw new Error(error.message)
  return data
}

export async function updateLineTemplate(
  id: string,
  updates: {
    body_text?: string
    coupon_text?: string | null
    booking_url?: string | null
    is_active?: boolean
  }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('line_template_settings')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/marketing/line')
}

export async function getGlobalSettings() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('global_settings')
    .select('*')

  if (error) throw new Error(error.message)
  return data
}

export async function updateGlobalSetting(key: string, value: string) {
  const supabase = createAdminClient()

  // upsert: レコードが無い場合は作成、ある場合は更新
  const { error } = await supabase
    .from('global_settings')
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )

  if (error) throw new Error(error.message)
  revalidatePath('/admin/marketing/line')
}
