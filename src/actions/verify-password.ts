'use server'

import { createClient } from '@/lib/supabase/server'
import { getCachedStaffInfo } from '@/lib/cached-auth'

/**
 * パスワードを検証する（削除操作の確認用）
 * Supabase の signInWithPassword で現在のユーザーのパスワードを検証
 */
export async function verifyPassword(password: string): Promise<{ valid: boolean; error?: string }> {
  const staff = await getCachedStaffInfo()
  if (!staff) return { valid: false, error: 'ログインが必要です' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: staff.email,
    password,
  })

  if (error) {
    return { valid: false, error: 'パスワードが正しくありません' }
  }

  return { valid: true }
}

/**
 * オーナー権限チェック（削除権限）
 */
export async function checkIsOwner(): Promise<boolean> {
  const staff = await getCachedStaffInfo()
  if (!staff) return false
  return !!(staff as unknown as Record<string, unknown>).is_owner
}
