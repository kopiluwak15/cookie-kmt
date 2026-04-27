'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CloudOff,
  CloudCheck,
  RefreshCw,
  Trash2,
  AlertCircle,
  Send,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { syncOfflineQueue, syncOfflineItem } from '@/lib/offline/sync'
import { removeOfflineItem, clearOfflineQueue, type OfflineQueueItem } from '@/lib/offline/queue'

const TYPE_LABELS: Record<OfflineQueueItem['type'], string> = {
  visit_log: '施術ログ',
}

function formatJst(iso: string): string {
  const d = new Date(iso)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  const m = jst.getUTCMonth() + 1
  const day = jst.getUTCDate()
  const h = String(jst.getUTCHours()).padStart(2, '0')
  const min = String(jst.getUTCMinutes()).padStart(2, '0')
  return `${m}/${day} ${h}:${min}`
}

export function OfflineLogsView() {
  const { items, count, isOnline, refresh } = useOfflineQueue()
  const [bulkSyncing, setBulkSyncing] = useState(false)
  const [singleSyncId, setSingleSyncId] = useState<string | null>(null)

  async function handleBulkSync() {
    setBulkSyncing(true)
    try {
      const r = await syncOfflineQueue()
      if (r.ok > 0) toast.success(`${r.ok}件を同期しました`)
      if (r.failed > 0) toast.error(`${r.failed}件は同期に失敗しました`)
      if (r.total === 0) toast('未送信データはありません')
      refresh()
    } finally {
      setBulkSyncing(false)
    }
  }

  async function handleSingleSync(id: string) {
    setSingleSyncId(id)
    try {
      const r = await syncOfflineItem(id)
      if (r.success) toast.success('同期しました')
      else toast.error(r.error || '同期に失敗しました')
      refresh()
    } finally {
      setSingleSyncId(null)
    }
  }

  function handleDelete(id: string) {
    if (!window.confirm('この未送信データを削除しますか？\nサーバーには反映されません。')) return
    removeOfflineItem(id)
    refresh()
    toast('未送信データを削除しました')
  }

  function handleClearAll() {
    if (!window.confirm(`${count}件すべての未送信データを削除しますか？\nサーバーには反映されません。`)) return
    clearOfflineQueue()
    refresh()
    toast('全件削除しました')
  }

  return (
    <div className="space-y-6">
      {/* オンライン状態 */}
      <Card
        className={
          isOnline
            ? 'border-emerald-200 bg-emerald-50/50'
            : 'border-amber-300 bg-amber-50'
        }
      >
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <CloudCheck className="h-6 w-6 text-emerald-600" />
            ) : (
              <CloudOff className="h-6 w-6 text-amber-600" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {isOnline ? 'オンライン' : 'オフライン'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOnline
                  ? '通信は正常です。未送信データがあれば同期できます。'
                  : '通信が確立していません。入力データは端末内に一時保存されます。'}
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                count > 0
                  ? 'border-red-500 text-red-700 bg-red-50'
                  : 'border-emerald-500 text-emerald-700 bg-emerald-50'
              }
            >
              未送信 {count}件
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 同期コントロール */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            手動同期
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            通信回復時は自動同期も試行されますが、確実に送信したい場合はこのボタンから実行してください。
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={handleBulkSync}
            disabled={bulkSyncing || count === 0 || !isOnline}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {bulkSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                同期中...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                未送信データを今すぐ同期 ({count}件)
              </>
            )}
          </Button>
          <Button onClick={refresh} variant="outline" disabled={bulkSyncing}>
            <RefreshCw className="h-4 w-4 mr-2" />
            再読み込み
          </Button>
          {count > 0 && (
            <Button
              onClick={handleClearAll}
              variant="outline"
              className="text-red-600 hover:bg-red-50"
              disabled={bulkSyncing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              全件削除
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">未送信データ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {count === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              未送信データはありません 🎉
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="border rounded-md p-3 bg-card flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {TYPE_LABELS[item.type] || item.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        保存: {formatJst(item.createdAt)}
                      </span>
                      {item.attemptCount > 0 && (
                        <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">
                          失敗 {item.attemptCount}回
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium break-words">{item.summary}</p>
                    {item.lastError && (
                      <div className="flex items-start gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="break-words">{item.lastError}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSingleSync(item.id)}
                      disabled={singleSyncId === item.id || !isOnline}
                    >
                      {singleSyncId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
