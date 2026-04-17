'use client'

import { LineTemplateEditor } from '@/components/features/line-template-editor'
import { LineGlobalSetting } from '@/components/features/line-global-setting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send } from 'lucide-react'

export default function ThankYouPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Send className="h-6 w-6 text-green-600" />
            サンキューLINE
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            初回来店のお客様に施術ログ保存時に即時送信されます
          </p>
        </div>
      </div>

      <LineTemplateEditor
        templateType="thank_you"
        description="初回来店（total_visits = 1）のお客様向けの歓迎メッセージです"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">共通設定</CardTitle>
        </CardHeader>
        <CardContent>
          <LineGlobalSetting
            settingKey="booking_url"
            label="予約URL"
            description="テンプレート内 {{booking_url}} に埋め込まれるURL"
            placeholder="https://..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
