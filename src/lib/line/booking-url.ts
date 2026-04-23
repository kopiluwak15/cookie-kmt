/**
 * LINE配信テンプレート別の予約URL解決。
 *
 * 規則:
 *   1. テンプレート専用URL (`booking_url_<template_type>`) が設定されていればそれを使う
 *   2. 設定されていなければ共通の `booking_url` にフォールバック
 *   3. どちらも無ければ空文字
 *
 * 例:
 *   resolveBookingUrl('maintenance_1')
 *     → `booking_url_maintenance_1` を参照 → 空なら `booking_url`
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type LineTemplateType =
  | 'thank_you'
  | 'thank_you_concept'
  | 'thank_you_repeat'
  | 'reminder1'
  | 'reminder2'
  | 'dormant'
  | 'maintenance_1'
  | 'maintenance_2'

/**
 * テンプレート種別ごとの予約URL設定キー名
 */
export function bookingUrlKeyFor(templateType: LineTemplateType): string {
  return `booking_url_${templateType}`
}

/**
 * 指定テンプレートに対する予約URLを取得。
 * テンプレート専用URL > 共通URL > '' の順で解決する。
 *
 * @param supabase 任意の Supabase クライアント（admin/server どちらでも可）
 * @param templateType テンプレート種別
 */
export async function resolveBookingUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  templateType: LineTemplateType
): Promise<string> {
  const specificKey = bookingUrlKeyFor(templateType)

  const { data } = await supabase
    .from('global_settings')
    .select('key, value')
    .in('key', [specificKey, 'booking_url'])

  const map = new Map<string, string>()
  for (const row of data || []) {
    if (row.value) map.set(row.key as string, row.value as string)
  }

  return map.get(specificKey) || map.get('booking_url') || ''
}
