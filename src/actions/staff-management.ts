'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedStaffInfo } from '@/lib/cached-auth'
import { revalidatePath } from 'next/cache'
import type { EmploymentType, Stage } from '@/types'

async function requireOwner(): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCachedStaffInfo()
  if (!staff) return { ok: false, error: 'ログインが必要です' }
  const isOwner = !!(staff as unknown as Record<string, unknown>).is_owner
  if (!isOwner) return { ok: false, error: 'この操作はオーナーのみ実行できます' }
  return { ok: true }
}

// スタッフ一覧取得（store リレーション含む）
export async function getStaffListWithStore() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('staff')
    .select('*, store:store_id(id, name, store_code)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

// スタッフ新規登録
export async function registerStaff(formData: FormData) {
  const adminClient = createAdminClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const role = formData.get('role') as 'admin' | 'staff'
  const storeId = formData.get('store_id') as string | null
  const employmentType = (formData.get('employment_type') as EmploymentType) || null
  const stage = (formData.get('stage') as Stage) || null
  const baseSalaryStr = formData.get('base_salary') as string | null
  const hourlyRateStr = formData.get('hourly_rate') as string | null
  const commissionRateStr = formData.get('commission_rate') as string | null

  if (!email || !password || !name || !role) {
    return { error: '必須項目を入力してください' }
  }

  if (password.length < 6) {
    return { error: 'パスワードは6文字以上で入力してください' }
  }

  // 1. Supabase Auth にユーザー作成
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
      return { error: 'このメールアドレスは既に登録されています' }
    }
    return { error: `ユーザー作成に失敗しました: ${authError.message}` }
  }

  // 2. staff テーブルに挿入
  const insertData: Record<string, unknown> = {
    auth_user_id: authData.user.id,
    email,
    name,
    role,
    store_id: storeId || null,
    is_active: true,
    must_change_password: true,
  }
  if (employmentType) insertData.employment_type = employmentType
  if (stage) {
    insertData.stage = stage
    insertData.stage_started_at = new Date().toISOString()
  }
  if (baseSalaryStr) insertData.base_salary = parseInt(baseSalaryStr, 10)
  if (hourlyRateStr) insertData.hourly_rate = parseInt(hourlyRateStr, 10)
  if (commissionRateStr) insertData.commission_rate = parseFloat(commissionRateStr)

  const { error: staffError } = await adminClient
    .from('staff')
    .insert(insertData)

  if (staffError) {
    // ロールバック: auth ユーザーを削除
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { error: `スタッフ登録に失敗しました: ${staffError.message}` }
  }

  revalidatePath('/admin/staff')
  return { success: true }
}

// スタッフ情報更新
export async function updateStaff(
  id: string,
  updates: {
    name?: string
    role?: 'admin' | 'staff'
    store_id?: string | null
    is_active?: boolean
    employment_type?: EmploymentType | null
    stage?: Stage | null
    base_salary?: number | null
    hourly_rate?: number | null
    commission_rate?: number | null
  }
) {
  const adminClient = createAdminClient()

  // ステージ変更時は開始日を自動更新
  const updateData: Record<string, unknown> = { ...updates }
  if ('stage' in updates && updates.stage) {
    // 現在のステージを取得して変更があるか確認
    const { data: current } = await adminClient
      .from('staff')
      .select('stage')
      .eq('id', id)
      .single()
    if (current && current.stage !== updates.stage) {
      updateData.stage_started_at = new Date().toISOString()
    }
  }

  // 雇用形態が正社員以外に変わった場合、ステージをクリア
  if (updates.employment_type && updates.employment_type !== 'full_time') {
    updateData.stage = null
    updateData.stage_started_at = null
    updateData.base_salary = null
  }
  if (updates.employment_type === 'full_time') {
    updateData.hourly_rate = null
    updateData.commission_rate = null
  }
  if (updates.employment_type === 'part_time') {
    updateData.commission_rate = null
  }
  if (updates.employment_type === 'contractor') {
    updateData.hourly_rate = null
  }

  const { error } = await adminClient
    .from('staff')
    .update(updateData)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/staff')
}

// スタッフ有効/無効切り替え
export async function toggleStaffActive(id: string, isActive: boolean) {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('staff')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/staff')
}

// スタッフ削除（暗証番号認証付き）
export async function deleteStaff(id: string) {
  const ownerCheck = await requireOwner()
  if (!ownerCheck.ok) return { error: ownerCheck.error }

  const adminClient = createAdminClient()

  // staff レコードを取得して auth_user_id を得る
  const { data: staff, error: fetchError } = await adminClient
    .from('staff')
    .select('auth_user_id')
    .eq('id', id)
    .single()

  if (fetchError || !staff) {
    return { error: 'スタッフが見つかりません' }
  }

  // staff テーブルから削除
  const { error: deleteError } = await adminClient
    .from('staff')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return { error: `削除に失敗しました: ${deleteError.message}` }
  }

  // Supabase Auth ユーザーも削除
  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(staff.auth_user_id)
  if (authDeleteError) {
    console.error('Auth user delete failed:', authDeleteError.message)
  }

  revalidatePath('/admin/staff')
  return { success: true }
}
