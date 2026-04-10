'use client'

import { useEffect, useState } from 'react'
import {
  getLineTemplates,
  updateLineTemplate,
  getGlobalSettings,
  updateGlobalSetting,
} from '@/actions/line-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import type { LineTemplateSetting, GlobalSetting } from '@/types'
import { MESSAGE_TYPE_LABELS } from '@/lib/constants'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

function getDemoTemplates(): LineTemplateSetting[] {
  return [
    {
      id: 'demo-t1', template_type: 'thank_you', title: 'サンキューLINE',
      body_text: '{{customer_name}}様\n\n本日はご来店いただき、ありがとうございました！\n{{style_name}}スタイル、とてもお似合いでした。\n\nまたのご来店をお待ちしております。\nCOOKIE 熊本',
      coupon_text: null, booking_url: null, is_active: true, updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'demo-t2', template_type: 'reminder1', title: 'リマインド①',
      body_text: '{{customer_name}}様\n\n前回のご来店から{{cycle_days}}日が経ちました。\nそろそろスタイルが気になる頃ではないでしょうか？\n\nご予約はこちらから↓\n{{booking_url}}\n\nCOOKIE 熊本',
      coupon_text: null, booking_url: null, is_active: true, updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'demo-t3', template_type: 'reminder2', title: 'リマインド②',
      body_text: '{{customer_name}}様\n\nお元気ですか？COOKIE 熊本です。\n前回のご来店からお日にちが経ちましたので、特別クーポンをお送りします！\n\n{{coupon_text}}\n\nご予約はこちら↓\n{{booking_url}}\n\nお待ちしております！',
      coupon_text: '次回ご来店時に使える10%OFFクーポン', booking_url: null, is_active: true, updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'demo-t4', template_type: 'dormant', title: '休眠顧客LINE',
      body_text: '{{customer_name}}様\n\nお久しぶりです！COOKIE 熊本です。\nまたお会いできるのを楽しみにしております。\n\n{{weekday_text}}\n\nご予約はこちら↓\n{{booking_url}}',
      coupon_text: null, booking_url: null, is_active: true, updated_at: '2025-01-01T00:00:00Z',
    },
  ]
}

function getDemoGlobalSettings(): GlobalSetting[] {
  return [
    { id: 'demo-g1', key: 'booking_url', value: 'https://beauty.hotpepper.jp/example/', updated_at: '2025-01-01T00:00:00Z' },
    { id: 'demo-g2', key: 'dormant_threshold_days', value: '90', updated_at: '2025-01-01T00:00:00Z' },
    { id: 'demo-g3', key: 'weekday_availability_text', value: '平日は比較的空いております。ぜひお気軽にご予約ください。', updated_at: '2025-01-01T00:00:00Z' },
    { id: 'demo-g4', key: 'roulette_win_rate', value: '1', updated_at: '2025-01-01T00:00:00Z' },
  ]
}

export default function LineSettingsPage() {
  const [templates, setTemplates] = useState<LineTemplateSetting[]>([])
  const [globalSettings, setGlobalSettings] = useState<GlobalSetting[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    if (!isSupabaseConfigured) {
      setTemplates(getDemoTemplates())
      setGlobalSettings(getDemoGlobalSettings())
      setLoaded(true)
      return
    }
    const [t, g] = await Promise.all([getLineTemplates(), getGlobalSettings()])
    setTemplates(t)
    setGlobalSettings(g)
    setLoaded(true)
  }

  function getSetting(key: string) {
    return globalSettings.find((s) => s.key === key)?.value || ''
  }

  async function handleSaveTemplate(template: LineTemplateSetting) {
    if (!isSupabaseConfigured) {
      toast.success('デモモード: テンプレートを保存しました（実際には保存されません）')
      return
    }
    try {
      await updateLineTemplate(template.id, {
        body_text: template.body_text,
        coupon_text: template.coupon_text,
        booking_url: template.booking_url,
        is_active: template.is_active,
      })
      toast.success('テンプレートを保存しました')
    } catch {
      toast.error('保存に失敗しました')
    }
  }

  async function handleSaveGlobal(key: string, value: string) {
    if (!isSupabaseConfigured) {
      toast.success('デモモード: 設定を保存しました（実際には保存されません）')
      return
    }
    try {
      await updateGlobalSetting(key, value)
      // ローカルステートも更新（画面に即反映）
      setGlobalSettings((prev) =>
        prev.some((s) => s.key === key)
          ? prev.map((s) => (s.key === key ? { ...s, value } : s))
          : [...prev, { id: '', key, value, updated_at: new Date().toISOString() }]
      )
      toast.success('設定を保存しました')
    } catch {
      toast.error('保存に失敗しました')
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">LINE配信設定</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground text-sm">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">LINE配信設定</h2>

      {!isSupabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          デモモードで表示中です。Supabaseの認証情報を .env.local に設定すると実データが表示されます。
        </div>
      )}

      {/* グローバル設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">共通設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>予約URL</Label>
            <div className="flex gap-2">
              <Input
                defaultValue={getSetting('booking_url')}
                placeholder="https://..."
                id="booking_url"
              />
              <Button
                size="sm"
                onClick={() => {
                  const el = document.getElementById('booking_url') as HTMLInputElement
                  handleSaveGlobal('booking_url', el.value)
                }}
              >
                <Save className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>公式LINE ベーシックID</Label>
            <div className="flex gap-2">
              <Input
                defaultValue={getSetting('line_oa_basic_id')}
                placeholder="@gxz9544w"
                id="line_oa_basic_id"
              />
              <Button
                size="sm"
                onClick={() => {
                  const el = document.getElementById('line_oa_basic_id') as HTMLInputElement
                  handleSaveGlobal('line_oa_basic_id', el.value.trim())
                }}
              >
                <Save className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              LINE Official Account Manager の「設定 → アカウント設定 → ベーシックID」で確認できる @ から始まる文字列。
              LIFFの初回起動時にお客様が友だち追加する際のリンク先に使われます。
            </p>
          </div>
          <div className="space-y-2">
            <Label>休眠顧客しきい値（日）</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                defaultValue={getSetting('dormant_threshold_days')}
                id="dormant_threshold"
              />
              <Button
                size="sm"
                onClick={() => {
                  const el = document.getElementById('dormant_threshold') as HTMLInputElement
                  handleSaveGlobal('dormant_threshold_days', el.value)
                }}
              >
                <Save className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>平日空き案内テキスト</Label>
            <div className="flex gap-2">
              <Input
                defaultValue={getSetting('weekday_availability_text')}
                id="weekday_text"
              />
              <Button
                size="sm"
                onClick={() => {
                  const el = document.getElementById('weekday_text') as HTMLInputElement
                  handleSaveGlobal('weekday_availability_text', el.value)
                }}
              >
                <Save className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-base font-semibold">メンテナンスチケット送信設定</Label>
            <p className="text-xs text-muted-foreground">
              コンセプトメニュー受診者にのみ自動送信されます。施術日からの経過日数と、チケット有効期限（送信日からの日数）を設定してください。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">メンテナンス① 何日後に送信</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  defaultValue={getSetting('maintenance_1_days_after') || '30'}
                  id="m1_days_after"
                />
                <Button size="sm" onClick={() => {
                  const el = document.getElementById('m1_days_after') as HTMLInputElement
                  handleSaveGlobal('maintenance_1_days_after', el.value)
                }}>
                  <Save className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">メンテナンス① 有効期限（日）</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  defaultValue={getSetting('maintenance_1_validity_days') || '14'}
                  id="m1_validity"
                />
                <Button size="sm" onClick={() => {
                  const el = document.getElementById('m1_validity') as HTMLInputElement
                  handleSaveGlobal('maintenance_1_validity_days', el.value)
                }}>
                  <Save className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">メンテナンス② 何日後に送信</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  defaultValue={getSetting('maintenance_2_days_after') || '60'}
                  id="m2_days_after"
                />
                <Button size="sm" onClick={() => {
                  const el = document.getElementById('m2_days_after') as HTMLInputElement
                  handleSaveGlobal('maintenance_2_days_after', el.value)
                }}>
                  <Save className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">メンテナンス② 有効期限（日）</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  defaultValue={getSetting('maintenance_2_validity_days') || '14'}
                  id="m2_validity"
                />
                <Button size="sm" onClick={() => {
                  const el = document.getElementById('m2_validity') as HTMLInputElement
                  handleSaveGlobal('maintenance_2_validity_days', el.value)
                }}>
                  <Save className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>ルーレット当選確率（%）</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                defaultValue={getSetting('roulette_win_rate') || '1'}
                id="roulette_win_rate"
                className="max-w-[120px]"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <Button
                size="sm"
                onClick={() => {
                  const el = document.getElementById('roulette_win_rate') as HTMLInputElement
                  handleSaveGlobal('roulette_win_rate', el.value)
                }}
              >
                <Save className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              2回目以降の来店時ルーレットの当選確率（例: 1 = 1/100）
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* テンプレート設定 */}
      <Tabs defaultValue="thank_you">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto">
          {templates.map((t) => (
            <TabsTrigger key={t.template_type} value={t.template_type} className="text-xs">
              {MESSAGE_TYPE_LABELS[t.template_type] || t.template_type}
            </TabsTrigger>
          ))}
        </TabsList>

        {templates.map((template) => (
          <TabsContent key={template.template_type} value={template.template_type}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {MESSAGE_TYPE_LABELS[template.template_type]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>メッセージ本文</Label>
                  <Textarea
                    rows={8}
                    defaultValue={template.body_text}
                    onChange={(e) => {
                      template.body_text = e.target.value
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    利用可能な変数: {'{{customer_name}}'}, {'{{style_name}}'}, {'{{cycle_days}}'}, {'{{coupon_text}}'}, {'{{weekday_text}}'}
                    {(template.template_type === 'maintenance_1' || template.template_type === 'maintenance_2') &&
                      `, {{ticket_valid_until}}, {{booking_url}}`}
                  </p>
                </div>

                {template.template_type === 'reminder2' && (
                  <div className="space-y-2">
                    <Label>クーポンテキスト</Label>
                    <Input
                      defaultValue={template.coupon_text || ''}
                      onChange={(e) => {
                        template.coupon_text = e.target.value
                      }}
                    />
                  </div>
                )}

                <Button onClick={() => handleSaveTemplate(template)}>
                  <Save className="h-4 w-4 mr-2" />
                  保存する
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
