'use client'

import { LineTemplateEditor } from '@/components/features/line-template-editor'
import { LineGlobalSetting } from '@/components/features/line-global-setting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, AlertCircle, Link as LinkIcon } from 'lucide-react'

export default function ThankYouRepeatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Send className="h-6 w-6 text-blue-600" />
          再サンキューLINE
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          2回目以降来店のお客様に施術ログ保存時に自動送信されます
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-900">
              2回目以降のお客様（total_visits &gt; 1）はこちらが自動送信されます。
              初回のお客様には「サンキュー」または「コンセプト用サンキュー」が送信されます。
            </p>
          </div>
        </CardContent>
      </Card>

      <LineTemplateEditor
        templateType="thank_you_repeat"
        description="再来店のお客様向けの、感謝と次回のご案内メッセージです"
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
            settingKey="booking_url_thank_you_repeat"
            label="再サンキュー 専用予約URL（任意）"
            description="このテンプレートだけ別URLを使う場合に指定"
            placeholder="https://..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
