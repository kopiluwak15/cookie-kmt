import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const TABLES = [
  'staff',
  'store',
  'customer',
  'visit_history',
  'style_settings',
  'service_menus',
  'line_message_history',
  'global_settings',
]

/**
 * 日次バックアップ: 全テーブルをJSONで Supabase Storage に保存
 * Vercel Cron: 毎日午前3時（JST）に実行
 */
export async function GET(request: Request) {
  // Vercel Cron 認証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
  const results: Record<string, number> = {}

  try {
    // 各テーブルをJSON化
    const backup: Record<string, unknown[]> = {}

    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select('*')
      if (error) {
        console.error(`[Backup] ${table} export failed:`, error.message)
        backup[table] = []
        results[table] = -1
      } else {
        backup[table] = data || []
        results[table] = data?.length || 0
      }
    }

    // JSONファイルとして Storage に保存
    const fileName = `backup-${dateStr}.json`
    const jsonStr = JSON.stringify(backup, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })

    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(fileName, blob, {
        upsert: true,
        contentType: 'application/json',
      })

    if (uploadError) {
      console.error('[Backup] upload failed:', uploadError.message)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // 30日以上前のバックアップを削除（容量節約）
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const { data: files } = await supabase.storage.from('backups').list()
    if (files) {
      const oldFiles = files.filter(f => {
        const match = f.name.match(/backup-(\d{4}-\d{2}-\d{2})\.json/)
        if (!match) return false
        return new Date(match[1]) < thirtyDaysAgo
      })
      if (oldFiles.length > 0) {
        await supabase.storage.from('backups').remove(oldFiles.map(f => f.name))
        console.log(`[Backup] Removed ${oldFiles.length} old backups`)
      }
    }

    console.log(`[Backup] Success: ${fileName}`, results)
    return NextResponse.json({ success: true, file: fileName, tables: results })
  } catch (err) {
    console.error('[Backup] Error:', err)
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 })
  }
}
