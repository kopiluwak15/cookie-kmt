/**
 * オフラインキューの同期処理
 *
 * 各 OfflineItemType に対して再送信ロジックを束ねる。
 * 通信回復時の自動同期 / ユーザー操作による手動同期から呼ばれる。
 */
'use client'

import { createVisitLog } from '@/actions/visit-log'
import {
  getOfflineQueue,
  removeOfflineItem,
  updateOfflineItem,
  payloadToFormData,
  type OfflineQueueItem,
} from './queue'

interface SyncSingleResult {
  success: boolean
  error?: string
}

async function syncSingle(item: OfflineQueueItem): Promise<SyncSingleResult> {
  try {
    if (item.type === 'visit_log') {
      const fd = payloadToFormData(item.payload)
      const result = await createVisitLog(fd)
      if (result?.success) {
        removeOfflineItem(item.id)
        return { success: true }
      }
      // サーバー側でvalidationエラー等。キューに残してエラー記録
      const errMsg = result?.error || '送信失敗（不明なエラー）'
      updateOfflineItem(item.id, {
        attemptCount: item.attemptCount + 1,
        lastError: errMsg,
      })
      return { success: false, error: errMsg }
    }
    // 未対応種別
    updateOfflineItem(item.id, {
      attemptCount: item.attemptCount + 1,
      lastError: `unsupported type: ${item.type}`,
    })
    return { success: false, error: 'unsupported type' }
  } catch (e) {
    // ネットワークエラー等
    const err = (e as Error).message || 'network error'
    updateOfflineItem(item.id, {
      attemptCount: item.attemptCount + 1,
      lastError: err,
    })
    return { success: false, error: err }
  }
}

export interface SyncSummary {
  total: number
  ok: number
  failed: number
}

/** キュー全件を順次同期する */
export async function syncOfflineQueue(): Promise<SyncSummary> {
  const items = getOfflineQueue()
  let ok = 0
  let failed = 0
  for (const item of items) {
    const r = await syncSingle(item)
    if (r.success) ok++
    else failed++
  }
  return { total: items.length, ok, failed }
}

/** 単一アイテムを同期する（個別「再送信」ボタン用） */
export async function syncOfflineItem(id: string): Promise<SyncSingleResult> {
  const item = getOfflineQueue().find((i) => i.id === id)
  if (!item) return { success: false, error: 'item not found' }
  return syncSingle(item)
}
