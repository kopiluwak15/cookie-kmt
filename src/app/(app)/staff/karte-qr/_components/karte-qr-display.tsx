'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Smartphone } from 'lucide-react'

export function KarteQrDisplay({ qrUrl }: { qrUrl: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4" style={{ minHeight: '70vh' }}>
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mx-auto">
          <Smartphone className="h-8 w-8 text-amber-600" />
        </div>

        <div>
          <h2 className="text-xl font-bold">顧客カルテ閲覧</h2>
          <p className="text-sm text-muted-foreground mt-1">
            スマートフォンでQRを読み取ってください
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm inline-block">
          <QRCodeSVG value={qrUrl} size={240} level="M" />
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p>LINE認証＋GPS確認後に顧客カルテを閲覧できます</p>
          <p>※ スタッフアカウントが必要です</p>
          <p>※ 店舗内でのみ閲覧可能です</p>
        </div>
      </div>
    </div>
  )
}
