'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import {
  parseAllowedIps,
  addAllowedIp,
  removeAllowedIp,
  normalizeIp,
  type AllowedIp,
} from '@/lib/ip-check'

/**
 * 管理画面を開いているスタッフ（オーナー）の公開IPを返す。
 * このIPを「店舗のWiFi」として登録するボタンに紐付ける。
 */
export async function detectCurrentIp(): Promise<{
  ip: string | null
  source: string | null
}> {
  const h = await headers()
  const xff = h.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return { ip: normalizeIp(first), source: 'x-forwarded-for' }
  }
  const xRealIp = h.get('x-real-ip')
  if (xRealIp) return { ip: normalizeIp(xRealIp), source: 'x-real-ip' }
  const cf = h.get('cf-connecting-ip')
  if (cf) return { ip: normalizeIp(cf), source: 'cf-connecting-ip' }
  return { ip: null, source: null }
}

/**
 * 指定店舗のWiFi(IP)設定を読む。
 */
export async function getStoreWifiSettings(storeId: string): Promise<{
  enabled: boolean
  allowedIps: AllowedIp[]
} | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('store')
    .select('timecard_wifi_enabled, timecard_allowed_ips')
    .eq('id', storeId)
    .single()
  if (error || !data) return null
  return {
    enabled: !!data.timecard_wifi_enabled,
    allowedIps: parseAllowedIps(data.timecard_allowed_ips),
  }
}

/**
 * 店舗のWiFi検証を有効/無効にする。
 */
export async function setStoreWifiEnabled(
  storeId: string,
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('store')
    .update({ timecard_wifi_enabled: enabled })
    .eq('id', storeId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/store-settings/stores')
  return { ok: true }
}

/**
 * 「今アクセスしているIP」を店舗の許可IPとして追加する。
 * クライアントから IP を渡させず、サーバーで自動検出するのが安全。
 */
export async function registerCurrentIpForStore(
  storeId: string,
  label?: string
): Promise<{ ok: boolean; error?: string; ip?: string }> {
  const { ip } = await detectCurrentIp()
  if (!ip) {
    return { ok: false, error: 'クライアントIPを検出できませんでした' }
  }

  const admin = createAdminClient()
  const { data: store, error: readErr } = await admin
    .from('store')
    .select('timecard_allowed_ips')
    .eq('id', storeId)
    .single()
  if (readErr || !store) {
    return { ok: false, error: '店舗が見つかりません' }
  }

  const current = parseAllowedIps(store.timecard_allowed_ips)
  const next = addAllowedIp(current, ip, label, 5)

  const { error: updateErr } = await admin
    .from('store')
    .update({ timecard_allowed_ips: next })
    .eq('id', storeId)
  if (updateErr) return { ok: false, error: updateErr.message }

  revalidatePath('/admin/store-settings/stores')
  return { ok: true, ip }
}

/**
 * 指定IPを店舗の許可リストから削除する。
 */
export async function removeAllowedIpFromStore(
  storeId: string,
  ip: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient()
  const { data: store, error: readErr } = await admin
    .from('store')
    .select('timecard_allowed_ips')
    .eq('id', storeId)
    .single()
  if (readErr || !store) return { ok: false, error: '店舗が見つかりません' }

  const current = parseAllowedIps(store.timecard_allowed_ips)
  const next = removeAllowedIp(current, normalizeIp(ip))

  const { error: updateErr } = await admin
    .from('store')
    .update({ timecard_allowed_ips: next })
    .eq('id', storeId)
  if (updateErr) return { ok: false, error: updateErr.message }

  revalidatePath('/admin/store-settings/stores')
  return { ok: true }
}
