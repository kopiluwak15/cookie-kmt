'use client'

import { LineTemplateEditor } from '@/components/features/line-template-editor'
import { LineGlobalSetting } from '@/components/features/line-global-setting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Link as LinkIcon } from 'lucide-react'

export default function ThankYouConceptPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Send className="h-6 w-6 text-purple-600" />
          コンセプト用サンキュー
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          コンセプトメニュー（髪質改善/縮毛矯正）の初回来店のお客様に施術ログ保存時に即時送信されます
        </p>
      </div>

      <LineTemplateEditor
        templateType="thank_you_concept"
        description="コンセプトメニュー受診の初回来店のお客様向けメッセージです"
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
            settingKey="booking_url_thank_you_concept"
            label="コンセプト用サンキュー 専用予約URL（任意）"
            description="このテンプレートだけ別URLを使う場合に指定"
            placeholder="https://..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
