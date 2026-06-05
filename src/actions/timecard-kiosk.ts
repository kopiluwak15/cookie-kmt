'use server'

import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedStaffInfo } from '@/lib/cached-auth'

/**
 * タブレット打刻（応急処置）用 Server Action
 *
 * - キオスク画面はログイン不要（共有端末）
 * - スタッフ一覧 → 自分の名前タップ → PIN → 理由 → 打刻
 * - 打刻後3秒で画面が自動リセットされる（重複防止）
 * - 「理由」は必須。プリセット5＋自由記述（other 時必須）
 *
 * 乱用検知のため admin の労務管理画面で月次集計可能。
 */

// 既存の admin PIN と同じ pepper 戦略
const STAFF_PIN_PEPPER = 'cookie-kmt::staff-tablet-pin::v1'

function hashStaffPin(pin: string): string {
  return crypto
    .createHash('sha256')
    .update(`${STAFF_PIN_PEPPER}|${pin}`, 'utf8')
    .digest('hex')
}

// ===== 理由プリセット =====
export const TABLET_REASON_PRESETS = [
  { key: 'forgot', label: '携帯を忘れた' },
  { key: 'battery', label: '携帯のバッテリー切れ' },
  { key: 'broken', label: '携帯が故障・水濡れ' },
  { key: 'line_error', label: 'LINEが開かない / 通信エラー' },
  { key: 'wifi_trouble', label: '店舗Wi-Fi不調' },
  { key: 'other', label: 'その他（理由を記入）' },
] as const

export type ReasonPresetKey = (typeof TABLET_REASON_PRESETS)[number]['key']

export interface KioskStaffItem {
  id: string
  name: string
  has_pin: boolean
  // 本日の打刻状況
  next_action: 'check_in' | 'check_out' | 'done'
}

/**
 * キオスク用のスタッフ一覧を取得（指定店舗 or 全店舗）。
 * ログイン不要で叩ける（共有端末からアクセス）。
 */
export async function getKioskStaffList(storeId?: string | null): Promise<{
  ok: boolean
  staff?: KioskStaffItem[]
  storeName?: string | null
  error?: string
}> {
  const admin = createAdminClient()

  let query = admin
    .from('staff')
    .select('id, name, timecard_pin_hash, store_id')
    .eq('is_active', true)
    .neq('role', 'admin') // 管理者は除外（必要なら緩和）
    .order('name', { ascending: true })

  if (storeId) query = query.eq('store_id', storeId)

  const { data: staffRows, error } = await query
  if (error) return { ok: false, error: error.message }

  const ids = (staffRows || []).map((s) => s.id)
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  let attendanceByStaff: Map<string, { checkin: string | null; checkout: string | null }> = new Map()

  if (ids.length > 0) {
    const { data: att } = await admin
      .from('attendance')
      .select('staff_id, checkin_time, checkout_time')
      .in('staff_id', ids)
      .eq('date', today)
    attendanceByStaff = new Map(
      (att || []).map((a) => [
        a.staff_id,
        { checkin: a.checkin_time, checkout: a.checkout_time },
      ])
    )
  }

  let storeName: string | null = null
  if (storeId) {
    const { data: store } = await admin
      .from('store')
      .select('name')
      .eq('id', storeId)
      .maybeSingle()
    storeName = (store?.name as string | undefined) || null
  }

  return {
    ok: true,
    staff: (staffRows || []).map((s) => {
      const att = attendanceByStaff.get(s.id)
      let nextAction: 'check_in' | 'check_out' | 'done' = 'check_in'
      if (att?.checkin && !att?.checkout) nextAction = 'check_out'
      else if (att?.checkin && att?.checkout) nextAction = 'done'
      return {
        id: s.id,
        name: s.name as string,
        has_pin: !!s.timecard_pin_hash,
        next_action: nextAction,
      }
    }),
    storeName,
  }
}

/**
 * 本人がマイページで自分のタブレット打刻PINを設定する。
 */
export async function setMyTabletPin(
  newPin: string,
  currentPin?: string
): Promise<{ success?: boolean; error?: string }> {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }
  if (!newPin || !/^[a-zA-Z0-9]{4,8}$/.test(newPin)) {
    return { error: 'PINは4〜8文字の英数字で指定してください' }
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('staff')
    .select('timecard_pin_hash')
    .eq('id', staff.id)
    .maybeSingle()

  if (existing?.timecard_pin_hash) {
    if (!currentPin || existing.timecard_pin_hash !== hashStaffPin(currentPin)) {
      return { error: '現在のPINが正しくありません' }
    }
  }

  const { error } = await admin
    .from('staff')
    .update({ timecard_pin_hash: hashStaffPin(newPin) })
    .eq('id', staff.id)

  if (error) return { error: `保存に失敗しました: ${error.message}` }
  return { success: true }
}

/**
 * タブレット打刻実行。
 * - 本人PIN必須
 * - 理由必須（プリセット必須 + other 時は自由記述必須）
 * - 直前に同じスタッフが同じ action を実行した直後の重複は拒否（10秒以内）
 */
export async function tabletPunch(input: {
  staffId: string
  pin: string
  action: 'check_in' | 'check_out'
  reasonPreset: ReasonPresetKey
  reasonText?: string
}): Promise<{
  ok: boolean
  error?: string
  staffName?: string
  time?: string
}> {
  const { staffId, pin, action, reasonPreset, reasonText } = input

  if (!staffId || !pin || !action || !reasonPreset) {
    return { ok: false, error: '必須項目が不足しています' }
  }
  const isValidPreset = TABLET_REASON_PRESETS.some((p) => p.key === reasonPreset)
  if (!isValidPreset) return { ok: false, error: '理由が不正です' }
  if (reasonPreset === 'other' && !reasonText?.trim()) {
    return { ok: false, error: 'その他を選んだ場合は理由を記入してください' }
  }

  const admin = createAdminClient()
  const { data: staff } = await admin
    .from('staff')
    .select('id, name, is_active, timecard_pin_hash')
    .eq('id', staffId)
    .maybeSingle()

  if (!staff || !staff.is_active) {
    return { ok: false, error: 'スタッフが見つかりません' }
  }
  if (!staff.timecard_pin_hash) {
    return {
      ok: false,
      error: 'このスタッフはタブレット打刻用PINを未設定です（マイページから設定）',
    }
  }
  if (staff.timecard_pin_hash !== hashStaffPin(pin)) {
    return { ok: false, error: 'PINが正しくありません' }
  }

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const now = new Date().toISOString()

  // 重複打刻ガード（直前10秒以内に同 action が成立していれば拒否）
  const { data: recent } = await admin
    .from('attendance')
    .select('checkin_time, checkout_time')
    .eq('staff_id', staff.id)
    .eq('date', today)
    .maybeSingle()

  const tenSecondsAgo = Date.now() - 10_000
  if (action === 'check_in' && recent?.checkin_time) {
    const t = new Date(recent.checkin_time).getTime()
    if (t > tenSecondsAgo) {
      return { ok: false, error: '直前に打刻が完了しています。少し待ってから再操作してください' }
    }
    // 既に出勤済みは普通の "done" とせずエラー
    return { ok: false, error: '本日は既に出勤済みです' }
  }
  if (action === 'check_out' && recent?.checkout_time) {
    const t = new Date(recent.checkout_time).getTime()
    if (t > tenSecondsAgo) {
      return { ok: false, error: '直前に打刻が完了しています' }
    }
    return { ok: false, error: '本日は既に退勤済みです' }
  }
  if (action === 'check_out' && !recent?.checkin_time) {
    return { ok: false, error: '出勤打刻がありません。先に出勤してください' }
  }

  if (action === 'check_in') {
    const { error } = await admin
      .from('attendance')
      .upsert(
        {
          staff_id: staff.id,
          date: today,
          checkin_time: now,
          checkin_via: 'tablet',
          checkin_reason_preset: reasonPreset,
          checkin_reason_text: reasonText?.trim() || null,
        },
        { onConflict: 'staff_id,date' }
      )
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await admin
      .from('attendance')
      .update({
        checkout_time: now,
        checkout_via: 'tablet',
        checkout_reason_preset: reasonPreset,
        checkout_reason_text: reasonText?.trim() || null,
      })
      .eq('staff_id', staff.id)
      .eq('date', today)
    if (error) return { ok: false, error: error.message }
  }

  return { ok: true, staffName: staff.name as string, time: now }
}

/**
 * 「今月このスタッフはタブレット打刻何回使ったか」を集計
 *  - 応急処置なので 3回/月 を超えたら指導対象として可視化する想定
 */
export async function countTabletPunchesThisMonth(staffId: string): Promise<number> {
  const admin = createAdminClient()
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const monthStart = `${yyyy}-${mm}-01`

  const { count } = await admin
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .eq('staff_id', staffId)
    .gte('date', monthStart)
    .or('checkin_via.eq.tablet,checkout_via.eq.tablet')

  return count || 0
}
