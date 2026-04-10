'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Smartphone } from 'lucide-react'

export default function KarteQrPage() {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kmt.cookie.hair'

  const qrUrl = liffId
    ? `https://liff.line.me/${liffId}?mode=karte`
    : `${appUrl}/liff/welcome?mode=karte`

  return (
    <main
      className="flex flex-col items-center justify-center px-4 bg-gradient-to-b from-amber-50 to-white"
      style={{ minHeight: '100dvh' }}
    >
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mx-auto">
          <Smartphone className="h-8 w-8 text-amber-600" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900">顧客カルテ閲覧</h1>
          <p className="text-sm text-gray-600 mt-1">
            スマートフォンでQRを読み取ってください
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm inline-block">
          <QRCodeSVG value={qrUrl} size={240} level="M" />
        </div>

        <div className="space-y-1 text-xs text-gray-500">
          <p>LINE認証＋GPS確認後に顧客カルテを閲覧できます</p>
          <p>※ スタッフアカウントが必要です</p>
          <p>※ 店舗内でのみ閲覧可能です</p>
        </div>
      </div>
    </main>
  )
}
