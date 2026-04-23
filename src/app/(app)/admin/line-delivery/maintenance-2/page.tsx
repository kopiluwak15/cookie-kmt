'use client'

import { LineTemplateEditor } from '@/components/features/line-template-editor'
import { LineGlobalSetting } from '@/components/features/line-global-setting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Link as LinkIcon } from 'lucide-react'

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
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            メンテナンス② 予約URL
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            メンテナンス専用のHPBメニューURLを設定すると、予約フォームが自動的にその料金で開きます。
            空の場合は共通予約URL（サンキューのページ参照）が使われます
          </p>
        </CardHeader>
        <CardContent>
          <LineGlobalSetting
            settingKey="booking_url_maintenance_2"
            label="メンテナンス② 専用予約URL（任意）"
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
