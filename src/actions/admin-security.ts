'use server'

import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedStaffInfo } from '@/lib/cached-auth'

const SETTINGS_KEY = 'admin_destructive_pin_hash'
// ペッパー: コード側に固定。PINとハッシュだけ漏れても復元されにくい
const PEPPER = 'cookie-kmt::destructive-action::v1'

function hashPin(pin: string): string {
  return crypto
    .createHash('sha256')
    .update(`${PEPPER}|${pin}`, 'utf8')
    .digest('hex')
}

/**
 * PINが設定されているかを確認。
 * 未設定なら管理者に設定を促すUIを出すために使う。
 */
export async function isAdminPinConfigured(): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('global_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()
  return !!data?.value
}

/**
 * 管理者PINを検証する。成功時のみ true。
 * 未設定の場合は false（= PIN設定してから実行してください）。
 */
export async function verifyAdminPin(pin: string): Promise<boolean> {
  if (!pin || typeof pin !== 'string') return false

  const admin = createAdminClient()
  const { data } = await admin
    .from('global_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()

  if (!data?.value) return false
  return data.value === hashPin(pin)
}

/**
 * 管理者PINを設定/変更する。管理者ロールのみ実行可能。
 * currentPin が指定された場合は事前検証する（変更時）。
 */
export async function setAdminPin(
  newPin: string,
  currentPin?: string
): Promise<{ success?: boolean; error?: string }> {
  const staff = await getCachedStaffInfo()
  if (!staff || staff.role !== 'admin') {
    return { error: '管理者権限が必要です' }
  }

  if (!newPin || !/^\d{4,10}$/.test(newPin)) {
    return { error: 'PINは4〜10桁の数字で指定してください' }
  }

  const admin = createAdminClient()

  // 既存PINがあれば currentPin で検証
  const existing = await admin
    .from('global_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()

  if (existing.data?.value) {
    if (!currentPin || existing.data.value !== hashPin(currentPin)) {
      return { error: '現在のPINが正しくありません' }
    }
  }

  const { error } = await admin.from('global_settings').upsert(
    {
      key: SETTINGS_KEY,
      value: hashPin(newPin),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )

  if (error) {
    return { error: `保存に失敗しました: ${error.message}` }
  }
  return { success: true }
}
