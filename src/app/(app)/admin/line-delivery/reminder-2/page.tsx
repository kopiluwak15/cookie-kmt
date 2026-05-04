'use client'

import { LineTemplateEditor } from '@/components/features/line-template-editor'
import { LineGlobalSetting } from '@/components/features/line-global-setting'
import { DeliveryAttributionCard } from '@/components/features/delivery-attribution-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Link as LinkIcon } from 'lucide-react'

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

      <DeliveryAttributionCard
        templateType="reminder2"
        windowDays={30}
        rangeDays={90}
      />

      <LineTemplateEditor
        templateType="reminder2"
        hasCouponField
        description="スタイル設定で定めた reminder2_days 後にクーポン付きで送信される2回目のリマインドです"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            予約URL 設定
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            空の場合は共通予約URL（サンキューのページ参照）が使われます
          </p>
        </CardHeader>
        <CardContent>
          <LineGlobalSetting
            settingKey="booking_url_reminder2"
            label="リマインド② 専用予約URL（任意）"
            description="このテンプレートだけ別URLを使う場合に指定"
            placeholder="https://..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
