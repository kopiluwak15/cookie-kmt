'use client'

import { LineTemplateEditor } from '@/components/features/line-template-editor'
import { Clock } from 'lucide-react'

export default function Reminder2Page() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-amber-600" />
          リマインド②
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          レギュラーメニューのお客様に、さらに日数が経過した後にクーポン付きで自動送信されます（毎日10:00）
        </p>
      </div>

      <LineTemplateEditor
        templateType="reminder2"
        hasCouponField
        description="スタイル設定で定めた reminder2_days 後にクーポン付きで送信される2回目のリマインドです"
      />
    </div>
  )
}
