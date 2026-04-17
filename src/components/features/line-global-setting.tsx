'use client'

import { useEffect, useState } from 'react'
import {
  getGlobalSettings,
  updateGlobalSetting,
} from '@/actions/line-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import type { GlobalSetting } from '@/types'

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

interface Props {
  settingKey: string
  label: string
  description?: string
  type?: 'text' | 'number'
  defaultValue?: string
  placeholder?: string
}

export function LineGlobalSetting({
  settingKey,
  label,
  description,
  type = 'text',
  defaultValue = '',
  placeholder,
}: Props) {
  const [value, setValue] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingKey])

  async function load() {
    if (!isSupabaseConfigured) {
      setValue(defaultValue)
      setLoaded(true)
      return
    }
    try {
      const all = await getGlobalSettings()
      const found = (all as GlobalSetting[]).find((s) => s.key === settingKey)
      setValue(found?.value || defaultValue)
    } catch (e) {
      console.error(`Failed to load setting ${settingKey}:`, e)
      setValue(defaultValue)
    } finally {
      setLoaded(true)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateGlobalSetting(settingKey, value)
      toast.success('設定を保存しました')
    } catch {
      toast.error('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return null

  return (
    <div className="space-y-1">
      <Label className="text-sm font-semibold">{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex gap-2">
        <Input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          min={type === 'number' ? '1' : undefined}
        />
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
