'use client'

import { LineTemplateEditor } from '@/components/features/line-template-editor'
import { LineGlobalSetting } from '@/components/features/line-global-setting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send } from 'lucide-react'

export default function Maintenance1Page() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Send className="h-6 w-6 text-purple-600" />
          メンテナンス①
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          コンセプトメニュー受診のお客様に、所定日数経過後にメンテナンスチケットを自動送信します（毎日11:00）
        </p>
      </div>

      <LineTemplateEditor
        templateType="maintenance_1"
        showTicketVar
        description="コンセプトメニュー1回目のメンテナンスチケット案内です"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">配信タイミング設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LineGlobalSetting
            settingKey="maintenance_1_days_after"
            label="何日後に送信"
            description="コンセプトメニュー受診日からの経過日数"
            type="number"
            defaultValue="30"
          />
          <LineGlobalSetting
            settingKey="maintenance_1_validity_days"
            label="チケット有効期限（日）"
            description="送信日からの有効日数 (テンプレート内 {{ticket_valid_until}} に埋め込まれる)"
            type="number"
            defaultValue="14"
          />
        </CardContent>
      </Card>
    </div>
  )
}
