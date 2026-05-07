'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * 非アクティブ検知: 一定時間操作がなければ自動ログアウトする。
 *
 * - localStorage に keep_signed_in=1 がある場合は追跡しない（ブラウザ閉じるまでセッション継続）
 * - それ以外: 60分操作なし → signOut → /login?reason=inactivity
 *
 * (app)/layout.tsx に1度だけマウントされる想定。
 */
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000 // 60分
const CHECK_INTERVAL_MS = 60 * 1000 // 1分間隔でチェック
const KEEP_SIGNED_IN_KEY = 'keep_signed_in'

export function SessionTimeoutTracker() {
  const router = useRouter()
  const lastActivityRef = useRef<number>(Date.now())

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 「ログイン状態を保つ」が有効なら何もしない
    const keep = localStorage.getItem(KEEP_SIGNED_IN_KEY) === '1'
    if (keep) return

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
    events.forEach((e) => document.addEventListener(e, onActivity, { passive: true }))

    const intervalId = window.setInterval(async () => {
      const idleMs = Date.now() - lastActivityRef.current
      if (idleMs > INACTIVITY_TIMEOUT_MS) {
        try {
          const supabase = createClient()
          await supabase.auth.signOut()
        } catch {
          // signOutに失敗してもログイン画面に飛ばす
        }
        // クライアント側のpreferenceもリセット
        try {
          localStorage.removeItem(KEEP_SIGNED_IN_KEY)
        } catch {}
        router.push('/login?reason=inactivity')
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      events.forEach((e) => document.removeEventListener(e, onActivity))
      window.clearInterval(intervalId)
    }
  }, [router])

  return null
}
