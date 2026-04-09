#!/usr/bin/env node
/**
 * scripts/import-menus.mjs
 *
 * COOKIE 熊本のスマレジ商品CSVを service_menus テーブルに反映する。
 *  - 既存の全 service_menus を削除（visit_history.service_menu は text のため安全）
 *  - CSV の全商品を category / estimated_minutes / is_concept 付きで一括 insert
 *
 * 実行:
 *   node scripts/import-menus.mjs
 */
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({ path: '.env.local' })
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 安全装置: cookie-kmt のプロジェクトでのみ動作
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
if (!URL.includes('tnswycbrudtstcpamlup')) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL が cookie-kmt ではありません:', URL)
  process.exit(1)
}

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY が設定されていません')
  process.exit(1)
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ============================================
// CSV パース（簡易: ダブルクォート対応）
// ============================================
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  const rows = []
  for (const line of lines) {
    const cells = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuote = !inQuote
        }
      } else if (ch === ',' && !inQuote) {
        cells.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur)
    rows.push(cells)
  }
  return rows
}

// ============================================
// カテゴリID → 表示名・推定時間
// ============================================
const CATEGORY_MAP = {
  '0001': { name: 'カット',           minutes: 60 },
  '0024': { name: 'カット',           minutes: 60 }, // MEN's CUT も同じグループ
  '0025': { name: 'カット',           minutes: 60 }, // 学生カット
  '0026': { name: '部分カット',       minutes: 30 },
  '0002': { name: 'カラー',           minutes: 60 },
  '0014': { name: 'カラー',           minutes: 60 }, // ホイルカラー
  '0003': { name: 'パーマ',           minutes: 90 },
  '0013': { name: 'パーマ',           minutes: 60 }, // ポイントパーマ
  '0004': { name: 'ストレート・縮毛矯正', minutes: 180 },
  '0005': { name: 'トリートメント',   minutes: 30 },
  '0007': { name: 'ヘッドスパ',       minutes: 30 },
  '0006': { name: 'オプション',       minutes: 10 },
  '0023': { name: 'セット・メイク',   minutes: 30 },
  '0012': { name: 'コスメパーマ',     minutes: 30 },
  '0015': { name: '店販（シャンプー）', minutes: 0 },
  '0016': { name: '店販（トリートメント）', minutes: 0 },
  '0017': { name: '店販（スタイリング）', minutes: 0 },
}

// カテゴリの並び順（visit-log 表示順）
const CATEGORY_ORDER = [
  'カット',
  '部分カット',
  'カラー',
  'パーマ',
  'ストレート・縮毛矯正',
  'トリートメント',
  'ヘッドスパ',
  'オプション',
  'コスメパーマ',
  'セット・メイク',
  '店販（シャンプー）',
  '店販（トリートメント）',
  '店販（スタイリング）',
]

// ============================================
// コンセプトメニュー判定
// ============================================
function isConceptMenu(catId, name) {
  // 0004 ストレート系は全部コンセプト
  if (catId === '0004') return true
  // 「モイスチャー」を含むものは髪質改善コンセプト
  if (name.includes('モイスチャー')) return true
  // 4Step トリートメント
  if (name.includes('4Step')) return true
  // 酵素クレンジングパーマ
  if (name.includes('酵素クレンジング')) return true
  return false
}

// ============================================
// メイン
// ============================================
async function main() {
  const csvPath = resolve(__dirname, 'cookie-kmt-menus.csv')
  const csvText = readFileSync(csvPath, 'utf-8')
  const rows = parseCsv(csvText)

  // ヘッダー2行（"v1300" + 列名）をスキップ
  const dataRows = rows.slice(2)

  console.log(`📋 CSV から ${dataRows.length} 行を読み込みました`)

  // 既存メニューを全削除
  console.log('🗑  既存の service_menus を削除中...')
  const { error: deleteError } = await supabase
    .from('service_menus')
    .delete()
    .not('id', 'is', null)
  if (deleteError) {
    console.error('❌ 削除失敗:', deleteError.message)
    process.exit(1)
  }

  // 挿入データを構築
  const records = []
  const seen = new Set()
  let displayOrder = 0
  for (const row of dataRows) {
    const catId = row[3]
    const name = row[4]
    const priceStr = row[14]
    if (!name) continue
    if (seen.has(name)) {
      console.warn(`⚠️  重複名スキップ: ${name}`)
      continue
    }
    seen.add(name)

    const cat = CATEGORY_MAP[catId] || { name: 'その他', minutes: 30 }
    const price = priceStr ? parseInt(priceStr, 10) : null

    records.push({
      name,
      category: cat.name,
      estimated_minutes: cat.minutes,
      default_price: Number.isFinite(price) ? price : null,
      display_order: ++displayOrder,
      is_active: true,
      is_concept: isConceptMenu(catId, name),
    })
  }

  console.log(`💾 ${records.length} 件を挿入中...`)
  const { error: insertError } = await supabase
    .from('service_menus')
    .insert(records)
  if (insertError) {
    console.error('❌ 挿入失敗:', insertError.message)
    process.exit(1)
  }

  // 結果サマリ
  const summary = {}
  for (const r of records) {
    summary[r.category] = (summary[r.category] || 0) + 1
  }
  console.log('\n✅ インポート完了')
  console.log('カテゴリ別件数:')
  for (const cat of CATEGORY_ORDER) {
    if (summary[cat]) console.log(`  ${cat}: ${summary[cat]}`)
  }
  const conceptCount = records.filter((r) => r.is_concept).length
  console.log(`\n★ コンセプトメニュー: ${conceptCount} 件`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
