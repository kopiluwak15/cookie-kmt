// カウンセリング再アンケート用の HMAC 署名トークン
// LINE を持っていない / 開きたくない顧客向けに、スタッフが発行する一時 URL を作る
import { createHmac, timingSafeEqual } from 'crypto'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24時間

function getSecret(): string {
  // 既存の環境変数を流用（環境変数を増やさない方針）
  const s = process.env.LINE_CHANNEL_SECRET
  if (!s) throw new Error('LINE_CHANNEL_SECRET is not set')
  return s
}

/**
 * customerId と発行時刻を HMAC 署名したトークンを作る。
 * フォーマット: base64url(customerId.issuedAtMs).base64url(hmacSig)
 */
export function signCounselingToken(customerId: string): string {
  const issuedAt = Date.now()
  const payload = `${customerId}.${issuedAt}`
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url')
  return `${payloadB64}.${sig}`
}

export interface VerifiedCounselingToken {
  customerId: string
  issuedAt: number
}

/**
 * トークンを検証し、有効なら customerId と発行時刻を返す。
 * 改ざん・期限切れ・形式不正のいずれかなら null。
 */
export function verifyCounselingToken(
  token: string | null | undefined
): VerifiedCounselingToken | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, sigB64] = parts

  let payload: string
  try {
    payload = Buffer.from(payloadB64, 'base64url').toString('utf8')
  } catch {
    return null
  }

  // 署名検証（timingSafeEqual で比較）
  let expected: Buffer
  let actual: Buffer
  try {
    expected = createHmac('sha256', getSecret()).update(payload).digest()
    actual = Buffer.from(sigB64, 'base64url')
  } catch {
    return null
  }
  if (expected.length !== actual.length) return null
  if (!timingSafeEqual(expected, actual)) return null

  const dot = payload.lastIndexOf('.')
  if (dot < 0) return null
  const customerId = payload.slice(0, dot)
  const issuedAt = Number(payload.slice(dot + 1))
  if (!customerId || !Number.isFinite(issuedAt)) return null

  // 期限チェック
  if (Date.now() - issuedAt > TOKEN_TTL_MS) return null

  return { customerId, issuedAt }
}

export const COUNSELING_TOKEN_TTL_MS = TOKEN_TTL_MS
