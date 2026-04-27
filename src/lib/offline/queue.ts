/**
 * オフラインキュー（localStorage ベース）
 *
 * 通信不可時に入力データを端末内に一時保存し、
 * 後でユーザー操作 or 通信回復時に再送信するための仕組み。
 *
 * 現状の対応データ種別: visit_log（施術ログ）
 * 拡張時は OfflineItemType を増やし、sync.ts に対応する送信ロジックを追加。
 */

const STORAGE_KEY = 'cookie_kmt_offline_queue_v1'
const QUEUE_CHANGE_EVENT = 'cookie-kmt-offline-queue-changed'

export type OfflineItemType = 'visit_log'

export interface OfflineQueueItem {
  /** 端末内の一意ID（同期前まで有効） */
  id: string
  /** 種別（再送信時の処理分岐用） */
  type: OfflineItemType
  /** FormDataなど、送信に必要なペイロードをシリアライズしたもの */
  payload: Record<string, string>
  /** UI表示用の要約（例: "C-0003 黒木様 / カット, ジュエルカラー"） */
  summary: string
  /** 端末で保存した日時（ISO） */
  createdAt: string
  /** 同期試行回数 */
  attemptCount: number
  /** 最後の同期失敗エラーメッセージ */
  lastError: string | null
}

function isClient(): boolean {
  return typeof window !== 'undefined'
}

/** キュー全件を取得（壊れていれば空配列） */
export function getOfflineQueue(): OfflineQueueItem[] {
  if (!isClient()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as OfflineQueueItem[]
  } catch {
    return []
  }
}

function saveQueue(items: OfflineQueueItem[]): void {
  if (!isClient()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    // 同一タブ内のリスナーへ通知（storage イベントは別タブのみ発火するため）
    window.dispatchEvent(new CustomEvent(QUEUE_CHANGE_EVENT))
  } catch (e) {
    console.error('[offline-queue] saveQueue failed:', e)
  }
}

/** 新しいアイテムをキューに追加 */
export function enqueueOffline(
  item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'attemptCount' | 'lastError'>
): OfflineQueueItem {
  const newItem: OfflineQueueItem = {
    id:
      isClient() && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    attemptCount: 0,
    lastError: null,
    ...item,
  }
  const items = getOfflineQueue()
  items.push(newItem)
  saveQueue(items)
  return newItem
}

/** 指定IDを削除 */
export function removeOfflineItem(id: string): void {
  const items = getOfflineQueue().filter((i) => i.id !== id)
  saveQueue(items)
}

/** 指定IDを部分更新（同期失敗時のエラー記録など） */
export function updateOfflineItem(
  id: string,
  patch: Partial<OfflineQueueItem>
): void {
  const items = getOfflineQueue().map((i) =>
    i.id === id ? { ...i, ...patch } : i
  )
  saveQueue(items)
}

/** 全件削除 */
export function clearOfflineQueue(): void {
  saveQueue([])
}

/**
 * キュー変更を購読する。Hook 等から呼び出して再描画に使う。
 * - 同一タブ内: CustomEvent で即時通知
 * - 別タブ間: storage イベント
 */
export function subscribeOfflineQueue(cb: () => void): () => void {
  if (!isClient()) return () => {}
  const inTabHandler = () => cb()
  const crossTabHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb()
  }
  window.addEventListener(QUEUE_CHANGE_EVENT, inTabHandler)
  window.addEventListener('storage', crossTabHandler)
  return () => {
    window.removeEventListener(QUEUE_CHANGE_EVENT, inTabHandler)
    window.removeEventListener('storage', crossTabHandler)
  }
}

/** FormData → プレーンオブジェクト（保存用） */
export function formDataToPayload(fd: FormData): Record<string, string> {
  const obj: Record<string, string> = {}
  fd.forEach((value, key) => {
    obj[key] = typeof value === 'string' ? value : ''
  })
  return obj
}

/** プレーンオブジェクト → FormData（再送信用） */
export function payloadToFormData(payload: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(payload)) {
    fd.set(k, v)
  }
  return fd
}
