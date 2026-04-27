'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getOfflineQueue,
  subscribeOfflineQueue,
  type OfflineQueueItem,
} from '@/lib/offline/queue'
import { syncOfflineQueue } from '@/lib/offline/sync'

/**
 * オフラインキューの状態と件数を購読するフック。
 * - キュー変更（追加/削除/更新）に追従
 * - online/offline 状態に追従
 * - オンライン復帰時に自動同期を試みる
 */
export function useOfflineQueue(options?: {
  /** trueの場合、navigator.onLine が true に切り替わった瞬間に自動同期を試行 */
  autoSyncOnReconnect?: boolean
}) {
  const autoSyncOnReconnect = options?.autoSyncOnReconnect ?? true

  const [items, setItems] = useState<OfflineQueueItem[]>([])
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  const refresh = useCallback(() => {
    setItems(getOfflineQueue())
  }, [])

  useEffect(() => {
    refresh()
    const unsub = subscribeOfflineQueue(refresh)

    const onOnline = async () => {
      setIsOnline(true)
      if (autoSyncOnReconnect) {
        // 自動同期は静かに実行（通知出さず、結果のみ反映）
        try {
          await syncOfflineQueue()
        } catch {
          // 失敗してもキュー側でエラー記録される
        }
        refresh()
      }
    }
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      unsub()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [refresh, autoSyncOnReconnect])

  return { items, count: items.length, isOnline, refresh }
}

/** バッジ表示など、件数だけ欲しい場合の軽量版 */
export function useOfflineQueueCount(): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    setCount(getOfflineQueue().length)
    const unsub = subscribeOfflineQueue(() => {
      setCount(getOfflineQueue().length)
    })
    return unsub
  }, [])
  return count
}
