'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * セッションタイムアウト検知（2種類）:
 *
 * 1. 非アクティブタイムアウト (60分操作なし → ログアウト)
 *    - keep_signed_in=1 の場合はスキップ
 *
 * 2. 絶対経過時間タイムアウト (ログインからの経過時間 → ログアウト)
 *    - 通常: 12時間で強制ログアウト
 *    - keep_signed_in=1: 30日で強制ログアウト
 *
 * (app)/layout.tsx に1度だけマウントされる想定。
 */
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000 // 60分（非アクティブ）
const ABSOLUTE_TIMEOUT_NORMAL_MS = 12 * 60 * 60 * 1000 // 12時間（通常）
const ABSOLUTE_TIMEOUT_KEEP_MS = 30 * 24 * 60 * 60 * 1000 // 30日（ログイン保持）
const CHECK_INTERVAL_MS = 60 * 1000 // 1分間隔でチェック

const KEEP_SIGNED_IN_KEY = 'keep_signed_in'
const LOGIN_AT_KEY = 'login_at'

export function SessionTimeoutTracker() {
  const router = useRouter()
  const lastActivityRef = useRef<number>(Date.now())

  useEffect(() => {
    if (typeof window === 'undefined') return

    const keep = localStorage.getItem(KEEP_SIGNED_IN_KEY) === '1'
    const absoluteLimitMs = keep ? ABSOLUTE_TIMEOUT_KEEP_MS : ABSOLUTE_TIMEOUT_NORMAL_MS

    // ログイン時刻が未記録（古いセッション等）の場合、現在時刻を仮設定
    // → 既存ログインユーザーをいきなり追い出さない
    if (!localStorage.getItem(LOGIN_AT_KEY)) {
      localStorage.setItem(LOGIN_AT_KEY, String(Date.now()))
    }

    // アクティビティ追跡（非アクティブ判定用）
    const onActivity = () => {
      lastActivityRef.current = Date.now()
    }
    const events: (keyof DocumentEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ]
    events.forEach((e) =>
      document.addEventListener(e, onActivity, { passive: true })
    )

    // ログアウト処理
    const performLogout = async (reason: 'inactivity' | 'expired') => {
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch {
        // signOut失敗時もログイン画面へ
      }
      try {
        localStorage.removeItem(KEEP_SIGNED_IN_KEY)
        localStorage.removeItem(LOGIN_AT_KEY)
      } catch {}
      router.push(`/login?reason=${reason}`)
    }

    const intervalId = window.setInterval(async () => {
      // 1. 絶対経過時間チェック（常時）
      const loginAtStr = localStorage.getItem(LOGIN_AT_KEY)
      if (loginAtStr) {
        const loginAt = parseInt(loginAtStr, 10)
        if (!isNaN(loginAt) && Date.now() - loginAt > absoluteLimitMs) {
          await performLogout('expired')
          return
        }
      }

      // 2. 非アクティブチェック（keep_signed_in が無い時のみ）
      if (!keep) {
        const idleMs = Date.now() - lastActivityRef.current
        if (idleMs > INACTIVITY_TIMEOUT_MS) {
          await performLogout('inactivity')
        }
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      events.forEach((e) => document.removeEventListener(e, onActivity))
      window.clearInterval(intervalId)
    }
  }, [router])

  return null
}
