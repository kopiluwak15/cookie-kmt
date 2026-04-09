import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const TOKEN = '2b4WUyG2+h8abPYmXgqiIq1HcWarna2sSWxBt98WwkX03EqRi+Iy0YwcqtzHIN3J2HrK+//UXZWCBXMe5Q14Tg6mraCqfhNC54n7sMRBvHaNZOzO+G0dZVBsqlarHIngeNBRgqxPMhK0cZnAYfLovgdB04t89/1O/w1cDnyilFU='
const APP_URL = 'https://app.cookie.hair'

async function main() {
  // 1. 既存のリッチメニューを削除
  console.log('=== 既存リッチメニューの確認 ===')
  const listRes = await fetch('https://api.line.me/v2/bot/richmenu/list', {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  const listData = await listRes.json()

  if (listData.richmenus && listData.richmenus.length > 0) {
    for (const rm of listData.richmenus) {
      console.log(`削除: ${rm.richMenuId}`)
      await fetch(`https://api.line.me/v2/bot/richmenu/${rm.richMenuId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${TOKEN}` },
      })
    }
  }

  // 2. 新しいリッチメニューを作成
  console.log('\n=== 新しいリッチメニュー作成 ===')
  const richMenuBody = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: 'COOKIE for MEN メニュー v2',
    chatBarText: 'メニューを開く',
    areas: [
      // 上段左: 平日限定 → 平日メニューページ
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: 'uri', uri: `${APP_URL}/menu/weekday.html`, label: '平日限定メニュー' },
      },
      // 上段中: 土日祝 → 土日メニューページ
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: 'uri', uri: `${APP_URL}/menu/weekend.html`, label: '土日祝メニュー' },
      },
      // 上段右: カット＆ブラックカラー → ホットペッパー
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: 'uri', uri: 'https://beauty.hotpepper.jp/CSP/bt/reserve/?storeId=H000654638&menuId=MN00000006683540&addMenu=0&rootCd=10', label: 'カット＆ブラックカラー' },
      },
      // 下段左: ホームページ
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: 'uri', uri: 'https://cookie-formen.site', label: 'ホームページ' },
      },
      // 下段中: 電話
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: 'uri', uri: 'tel:0962883577', label: '電話する' },
      },
      // 下段右: 美容師さんご紹介 → リクルートページ
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: 'uri', uri: `${APP_URL}/recruit.html`, label: '美容師さんご紹介' },
      },
    ],
  }

  const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(richMenuBody),
  })
  const createData = await createRes.json()
  console.log('作成結果:', createData)
  const richMenuId = createData.richMenuId

  if (!richMenuId) {
    console.error('リッチメニュー作成失敗')
    process.exit(1)
  }

  // 3. 画像をアップロード
  console.log('\n=== 画像アップロード ===')
  const imagePath = path.join(__dirname, '..', 'public', 'richmenu.png')
  const imageBuffer = fs.readFileSync(imagePath)

  const uploadRes = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'image/png',
      },
      body: imageBuffer,
    }
  )
  console.log('アップロード結果:', uploadRes.status, await uploadRes.text())

  // 4. デフォルトリッチメニューに設定
  console.log('\n=== デフォルトに設定 ===')
  const defaultRes = await fetch(
    `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
    }
  )
  console.log('デフォルト設定:', defaultRes.status, await defaultRes.text())

  console.log('\n✅ 完了! richMenuId:', richMenuId)
  console.log('\nリンク先:')
  console.log('  平日限定 → ' + APP_URL + '/menu/weekday')
  console.log('  土日祝   → ' + APP_URL + '/menu/weekend')
  console.log('  カラー   → Hot Pepper Beauty')
  console.log('  HP       → cookie-formen.site')
  console.log('  電話     → tel:0962883577')
  console.log('  紹介     → ' + APP_URL + '/recruit')
}

main().catch(console.error)
