/**
 * src/lib/ip-check.ts
 *
 * クライアントの公開IPを取得し、店舗の許可IPと突合する。
 *
 * - Vercel / Cloudflare 経由でも正しく取れるよう、複数ヘッダから抽出
 * - 動的IP対策で「許可IP配列」の中に1件でも一致すればOK
 * - 一致した IP の last_seen_at を更新（呼び出し側）するための値も返す
 */

import type { NextRequest } from 'next/server'

export type AllowedIp = {
  ip: string
  label?: string
  registered_at: string
  last_seen_at?: string
}

/**
 * リクエストのヘッダからクライアントの公開IPを抽出する。
 * 優先順位:
 *  1. x-forwarded-for（カンマ区切りの先頭が真のクライアント）
 *  2. x-real-ip
 *  3. cf-connecting-ip（Cloudflare）
 *  4. fly-client-ip（Fly.io）
 */
export function getClientIp(req: Request | NextRequest): string | null {
  const headers = req.headers

  const xff = headers.get('x-forwarded-for')
  if (xff) {
    // "client, proxy1, proxy2" → 先頭
    const first = xff.split(',')[0]?.trim()
    if (first) return normalizeIp(first)
  }

  const xRealIp = headers.get('x-real-ip')
  if (xRealIp) return normalizeIp(xRealIp.trim())

  const cf = headers.get('cf-connecting-ip')
  if (cf) return normalizeIp(cf.trim())

  const fly = headers.get('fly-client-ip')
  if (fly) return normalizeIp(fly.trim())

  return null
}

/**
 * IPアドレスの正規化（IPv6 mapped IPv4 を IPv4 に直す等）
 *  - "::ffff:153.x.x.x" → "153.x.x.x"
 */
export function normalizeIp(ip: string): string {
  const trimmed = ip.trim()
  if (trimmed.startsWith('::ffff:')) return trimmed.slice(7)
  return trimmed
}

/**
 * 許可IPリストの形状を保証してパースする（jsonb はゆるい型なので）
 */
export function parseAllowedIps(raw: unknown): AllowedIp[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const obj = item as Record<string, unknown>
      const ip = typeof obj.ip === 'string' ? normalizeIp(obj.ip) : null
      if (!ip) return null
      return {
        ip,
        label: typeof obj.label === 'string' ? obj.label : undefined,
        registered_at:
          typeof obj.registered_at === 'string'
            ? obj.registered_at
            : new Date().toISOString(),
        last_seen_at:
          typeof obj.last_seen_at === 'string' ? obj.last_seen_at : undefined,
      } as AllowedIp
    })
    .filter((x): x is AllowedIp => x !== null)
}

/**
 * 「クライアントIPが許可リストに含まれているか」を判定。
 *  - 厳密一致のみ（サブネット指定は将来対応）
 */
export function isIpAllowed(
  clientIp: string | null,
  allowedIps: AllowedIp[]
): { allowed: boolean; matched: AllowedIp | null } {
  if (!clientIp || allowedIps.length === 0) {
    return { allowed: false, matched: null }
  }
  const matched = allowedIps.find((a) => a.ip === clientIp) || null
  return { allowed: !!matched, matched }
}

/**
 * 「最大件数まで」を考慮した許可IP追加ロジック。
 *  - 既に同じIPがあれば登録日時を更新せず last_seen_at だけ更新
 *  - 上限を超える場合は、一番古い last_seen_at（または registered_at）を削除
 */
export function addAllowedIp(
  current: AllowedIp[],
  ip: string,
  label: string | undefined,
  maxEntries: number = 5
): AllowedIp[] {
  const now = new Date().toISOString()
  const existing = current.find((a) => a.ip === ip)

  if (existing) {
    // 既存IP → last_seen_at と label のみ更新
    return current.map((a) =>
      a.ip === ip
        ? { ...a, last_seen_at: now, label: label ?? a.label }
        : a
    )
  }

  const newEntry: AllowedIp = {
    ip,
    label: label || undefined,
    registered_at: now,
    last_seen_at: now,
  }

  const merged = [...current, newEntry]
  if (merged.length <= maxEntries) return merged

  // 上限超過 → last_seen_at（無ければ registered_at）が一番古いものを除外
  const sorted = [...merged].sort((a, b) => {
    const aKey = a.last_seen_at || a.registered_at
    const bKey = b.last_seen_at || b.registered_at
    return aKey.localeCompare(bKey)
  })
  // 古い順に並んだ先頭を捨てる
  return sorted.slice(merged.length - maxEntries)
}

/**
 * 許可IPを1件削除する
 */
export function removeAllowedIp(current: AllowedIp[], ip: string): AllowedIp[] {
  return current.filter((a) => a.ip !== ip)
}
