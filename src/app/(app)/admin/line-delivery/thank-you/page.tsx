'use client'

import { LineTemplateEditor } from '@/components/features/line-template-editor'
import { LineGlobalSetting } from '@/components/features/line-global-setting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Link as LinkIcon } from 'lucide-react'

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
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            予約URL 設定
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            サンキュー専用URLが空の場合は、共通予約URLが使われます
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <LineGlobalSetting
            settingKey="booking_url_thank_you"
            label="サンキュー専用予約URL（任意）"
            description="このテンプレートだけ別URLを使う場合に指定"
            placeholder="https://..."
          />
          <LineGlobalSetting
            settingKey="booking_url"
            label="共通予約URL"
            description="各テンプレートで専用URL未設定の場合のフォールバック。全テンプレートで使われる重要設定です"
            placeholder="https://..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
