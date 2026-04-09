'use client'

import { useEffect, useState } from 'react'
import { getLineTemplates, updateLineTemplate } from '@/actions/line-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Save, Ticket } from 'lucide-react'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function CouponsPage() {
  const [couponText, setCouponText] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured) {
        setCouponText('次回ご来店時に使える10%OFFクーポン')
        setTemplateId('demo-t3')
        setLoading(false)
        return
      }
      const templates = await getLineTemplates()
      const reminder2 = templates.find((t) => t.template_type === 'reminder2')
      if (reminder2) {
        setCouponText(reminder2.coupon_text || '')
        setTemplateId(reminder2.id)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!isSupabaseConfigured) {
      toast.success('デモモード: クーポン内容を保存しました（実際には保存されません）')
      return
    }
    try {
      await updateLineTemplate(templateId, { coupon_text: couponText })
      toast.success('クーポン内容を保存しました')
    } catch {
      toast.error('保存に失敗しました')
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">読み込み中...</div>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">クーポン管理</h2>

      {!isSupabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          デモモードで表示中です。Supabaseの認証情報を .env.local に設定すると実データが表示されます。
        </div>
      )}

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            リマインド②クーポン
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            リマインド②LINEに含まれるクーポンテキストを設定します。
          </p>
          <div className="space-y-2">
            <Label>クーポンテキスト</Label>
            <Input
              value={couponText}
              onChange={(e) => setCouponText(e.target.value)}
              placeholder="例: 次回ご来店時に使える10%OFFクーポン"
            />
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            保存する
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
