'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Megaphone, Save, Check } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

type CampaignData = {
  title: string
  description: string
  link: string
}

type AllCampaigns = Record<string, CampaignData>

const MONTHS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
]

const DEFAULT_LINK = 'https://beauty.hotpepper.jp/slnH000654498/coupon/'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<AllCampaigns>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 日本時間の現在月
  const now = new Date()
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const currentMonth = jstNow.getMonth() + 1

  useEffect(() => {
    loadCampaigns()
  }, [])

  async function loadCampaigns() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'monthly_campaigns')
      .single()

    if (data) {
      try {
        setCampaigns(JSON.parse(data.value))
      } catch {
        initDefaults()
      }
    } else {
      initDefaults()
    }
    setLoading(false)
  }

  function initDefaults() {
    const defaults: AllCampaigns = {}
    for (let m = 1; m <= 12; m++) {
      defaults[String(m)] = {
        title: `${m}月キャンペーン`,
        description: '',
        link: DEFAULT_LINK,
      }
    }
    setCampaigns(defaults)
  }

  function updateCampaign(month: number, field: keyof CampaignData, value: string) {
    setCampaigns((prev) => ({
      ...prev,
      [String(month)]: {
        ...prev[String(month)],
        [field]: value,
      },
    }))
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase
      .from('global_settings')
      .update({ value: JSON.stringify(campaigns), updated_at: new Date().toISOString() })
      .eq('key', 'monthly_campaigns')

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-7 w-7" />
          <h2 className="text-2xl font-bold">キャンペーン管理</h2>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              保存しました
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存する'}
            </>
          )}
        </Button>
      </div>

      <p className="text-muted-foreground">
        月ごとのキャンペーン内容を設定します。その月になると自動的にメニューページに反映されます。
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MONTHS.map((label, i) => {
          const month = i + 1
          const data = campaigns[String(month)] || { title: '', description: '', link: DEFAULT_LINK }
          const isCurrent = month === currentMonth

          return (
            <Card key={month} className={isCurrent ? 'border-primary ring-2 ring-primary/20' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {isCurrent && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">今月</span>}
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">タイトル</Label>
                  <Input
                    value={data.title}
                    onChange={(e) => updateCampaign(month, 'title', e.target.value)}
                    placeholder={`${month}月キャンペーン`}
                  />
                </div>
                <div>
                  <Label className="text-xs">説明文</Label>
                  <Input
                    value={data.description}
                    onChange={(e) => updateCampaign(month, 'description', e.target.value)}
                    placeholder="キャンペーンの詳細"
                  />
                </div>
                <div>
                  <Label className="text-xs">リンク先URL</Label>
                  <Input
                    value={data.link}
                    onChange={(e) => updateCampaign(month, 'link', e.target.value)}
                    placeholder={DEFAULT_LINK}
                    className="text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
