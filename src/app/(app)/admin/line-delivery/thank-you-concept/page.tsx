'use client'

import { LineTemplateEditor } from '@/components/features/line-template-editor'
import { Send } from 'lucide-react'

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
    </div>
  )
}
