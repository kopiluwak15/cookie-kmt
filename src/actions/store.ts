'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getStores() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store')
    .select('*')
    .order('created_at')

  if (error) throw new Error(error.message)
  return data
}

export async function createStore(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const storeCode = formData.get('store_code') as string
  const address = formData.get('address') as string | null
  const phone = formData.get('phone') as string | null

  if (!name || !storeCode) {
    return { error: '店舗名と店舗コードは必須です' }
  }

  const { error } = await supabase.from('store').insert({
    name,
    store_code: storeCode.toUpperCase(),
    address: address || null,
    phone: phone || null,
  })

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('store_code')) {
      return { error: 'この店舗コードは既に使用されています' }
    }
    return { error: `店舗の作成に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/store-settings/stores')
  return { success: true }
}

export async function updateStore(
  id: string,
  updates: {
    name?: string
    address?: string | null
    phone?: string | null
    is_active?: boolean
    latitude?: number | null
    longitude?: number | null
    gps_radius_meters?: number
  }
) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('store')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/store-settings/stores')
}
