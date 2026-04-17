'use client'

import { LineTemplateEditor } from '@/components/features/line-template-editor'
import { LineGlobalSetting } from '@/components/features/line-global-setting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send } from 'lucide-react'

export default function Maintenance2Page() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Send className="h-6 w-6 text-pink-600" />
          メンテナンス②
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          メンテナンス①からさらに日数経過後に再送される2回目のメンテナンスチケットです（毎日11:00）
        </p>
      </div>

      <LineTemplateEditor
        templateType="maintenance_2"
        showTicketVar
        description="コンセプトメニュー2回目のメンテナンスチケット案内です"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">配信タイミング設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LineGlobalSetting
            settingKey="maintenance_2_days_after"
            label="何日後に送信"
            description="コンセプトメニュー受診日からの経過日数"
            type="number"
            defaultValue="60"
          />
          <LineGlobalSetting
            settingKey="maintenance_2_validity_days"
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
