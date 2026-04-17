'use client'

import { LineTemplateEditor } from '@/components/features/line-template-editor'
import { Clock } from 'lucide-react'

export default function Reminder1Page() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-blue-600" />
          リマインド①
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          レギュラーメニューのお客様に、スタイル別のリマインド日数経過後に自動送信されます（毎日10:00）
        </p>
      </div>

      <LineTemplateEditor
        templateType="reminder1"
        description="スタイル設定で定めた reminder1_days 後に送信される1回目のリマインドです"
      />
    </div>
  )
}
