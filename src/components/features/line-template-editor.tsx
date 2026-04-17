'use client'

import { useEffect, useState } from 'react'
import {
  getLineTemplates,
  updateLineTemplate,
} from '@/actions/line-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Save, AlertCircle } from 'lucide-react'
import type { LineTemplateSetting } from '@/types'
import { MESSAGE_TYPE_LABELS } from '@/lib/constants'

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

interface Props {
  templateType: string
  /** ticket_valid_until 変数の案内を表示するか */
  showTicketVar?: boolean
  /** reminder2 のようにクーポンテキスト欄が必要か */
  hasCouponField?: boolean
  /** 補足説明 */
  description?: string
}

export function LineTemplateEditor({
  templateType,
  showTicketVar = false,
  hasCouponField = false,
  description,
}: Props) {
  const [template, setTemplate] = useState<LineTemplateSetting | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bodyText, setBodyText] = useState('')
  const [couponText, setCouponText] = useState('')

  useEffect(() => {
    loadTemplate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateType])

  async function loadTemplate() {
    if (!isSupabaseConfigured) {
      setLoaded(true)
      return
    }
    try {
      const all = await getLineTemplates()
      const found = (all as LineTemplateSetting[]).find(
        (t) => t.template_type === templateType
      )
      if (found) {
        setTemplate(found)
        setBodyText(found.body_text || '')
        setCouponText(found.coupon_text || '')
      }
    } catch (e) {
      console.error('Failed to load template:', e)
    } finally {
      setLoaded(true)
    }
  }

  async function handleSave() {
    if (!template) return
    setSaving(true)
    try {
      await updateLineTemplate(template.id, {
        body_text: bodyText,
        coupon_text: hasCouponField ? couponText : template.coupon_text,
        booking_url: template.booking_url,
        is_active: template.is_active,
      })
      toast.success('テンプレートを保存しました')
    } catch {
      toast.error('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground text-sm">読み込み中...</div>
      </div>
    )
  }

  if (!template) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">
                テンプレートが見つかりません
              </p>
              <p className="text-sm text-amber-800 mt-1">
                このテンプレート（{MESSAGE_TYPE_LABELS[templateType] || templateType}）は
                まだデータベースに登録されていません。後続のデプロイで追加されます。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const varsNote = [
    '{{customer_name}}',
    '{{style_name}}',
    '{{cycle_days}}',
    '{{next_visit_date}}',
    hasCouponField ? '{{coupon_text}}' : '',
    '{{weekday_text}}',
    '{{booking_url}}',
    showTicketVar ? '{{ticket_valid_until}}' : '',
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {MESSAGE_TYPE_LABELS[templateType] || templateType}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>メッセージ本文</Label>
          <Textarea
            rows={10}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            利用可能な変数: {varsNote}
          </p>
        </div>

        {hasCouponField && (
          <div className="space-y-2">
            <Label>クーポンテキスト</Label>
            <Input
              value={couponText}
              onChange={(e) => setCouponText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              テンプレート内の {'{{coupon_text}}'} に埋め込まれます
            </p>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? '保存中...' : '保存する'}
        </Button>
      </CardContent>
    </Card>
  )
}
