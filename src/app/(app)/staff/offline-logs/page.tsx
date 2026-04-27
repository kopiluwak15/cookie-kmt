'use client'

import { OfflineLogsView } from '@/components/features/offline-logs-view'
import { CloudOff } from 'lucide-react'

export default function StaffOfflineLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CloudOff className="h-6 w-6" />
          オフラインログ
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          通信不可時に端末内に一時保存された未送信データを確認・送信できます
        </p>
      </div>

      <OfflineLogsView />
    </div>
  )
}
