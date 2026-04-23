'use client'

import { LineTemplateEditor } from '@/components/features/line-template-editor'
import { LineGlobalSetting } from '@/components/features/line-global-setting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Link as LinkIcon } from 'lucide-react'

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
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            メンテナンス① 予約URL
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            メンテナンス専用のHPBメニューURLを設定すると、予約フォームが自動的にその料金で開きます。
            空の場合は共通予約URL（サンキューのページ参照）が使われます
          </p>
        </CardHeader>
        <CardContent>
          <LineGlobalSetting
            settingKey="booking_url_maintenance_1"
            label="メンテナンス① 専用予約URL（任意）"
            description="例: HPB のメンテナンス専用メニューURL"
            placeholder="https://..."
          />
        </CardContent>
      </Card>

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
