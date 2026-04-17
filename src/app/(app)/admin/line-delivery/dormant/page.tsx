'use client'

import { LineTemplateEditor } from '@/components/features/line-template-editor'
import { LineGlobalSetting } from '@/components/features/line-global-setting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function DormantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
          休眠顧客LINE
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          設定日数以上来店のないお客様に自動送信されます（毎週月曜10:00）
        </p>
      </div>

      <LineTemplateEditor
        templateType="dormant"
        description="長期間ご来店がないお客様への再来店促進メッセージです"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">配信タイミング設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LineGlobalSetting
            settingKey="dormant_threshold_days"
            label="休眠しきい値（日）"
            description="この日数以上来店のないお客様に送信"
            type="number"
            defaultValue="90"
          />
          <LineGlobalSetting
            settingKey="weekday_availability_text"
            label="平日空き案内テキスト"
            description="テンプレート内 {{weekday_text}} に埋め込まれる案内文"
            placeholder="平日は比較的空いております。ぜひお気軽にご予約ください。"
          />
        </CardContent>
      </Card>
    </div>
  )
}
