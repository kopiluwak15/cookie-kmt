'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Printer, QrCode, ExternalLink } from 'lucide-react'

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kmt.cookie.hair'
const WALKIN_URL = `${APP_URL}/walkin`
const LOGIN_URL = `${APP_URL}/login`
const TIMECARD_URL = LIFF_ID
  ? `https://liff.line.me/${LIFF_ID}?mode=timecard`
  : `${APP_URL}/liff/timecard`

export default function QrCodesPage() {
  // LIFF URLがある場合はLINEアプリ内で開く（自動ユーザー識別）
  const surveyUrl = LIFF_ID
    ? `https://liff.line.me/${LIFF_ID}`
    : `${APP_URL}/liff/welcome`

  function handlePrint(type: 'survey' | 'walkin' | 'login' | 'labor') {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrElement = document.getElementById(`qr-${type}`)
    if (!qrElement) return

    const svgContent = qrElement.innerHTML
    const titles: Record<string, string> = {
      survey: 'Check IN',
      walkin: 'Guest Registration',
      login: 'Staff Login',
      labor: 'TimeCard',
    }
    const subtitles: Record<string, string> = {
      survey: 'QRコードを読み取ってチェックイン',
      walkin: 'QRコードを読み取ってご登録ください',
      login: 'QRコードを読み取ってログイン',
      labor: 'QRコードを読み取ってスタッフ勤務管理（出勤・退勤）',
    }
    const title = titles[type]
    const subtitle = subtitles[type]

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} QR - 縮毛矯正＆髪質改善COOKIE熊本</title>
        <style>
          @page { size: A5; margin: 15mm; }
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', sans-serif;
            color: #1a1a1a;
          }
          .container {
            text-align: center;
            padding: 20px;
          }
          .store-name {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 8px;
            letter-spacing: 1px;
            line-height: 1.3;
          }
          .divider {
            width: 60px;
            height: 3px;
            background: #1a1a1a;
            margin: 16px auto;
          }
          .subtitle {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 24px;
          }
          .qr-wrapper {
            display: inline-block;
            padding: 16px;
            border: 2px solid #e5e5e5;
            border-radius: 12px;
            margin-bottom: 20px;
          }
          .qr-wrapper svg {
            width: 200px;
            height: 200px;
          }
          .description {
            font-size: 14px;
            color: #666;
            margin-top: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="store-name">縮毛矯正＆髪質改善<br/>COOKIE 熊本</div>
          <div class="divider"></div>
          <div class="subtitle">${subtitle}</div>
          <div class="qr-wrapper">
            ${svgContent}
          </div>
          <div class="description">
            スマートフォンのカメラでQRコードを読み取ってください
          </div>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <QrCode className="h-7 w-7" />
        <h2 className="text-2xl font-bold">QRコード</h2>
      </div>

      <p className="text-muted-foreground">
        店舗に設置するQRコードを生成・印刷できます。
      </p>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Check IN QR */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              ✅ Check IN QR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              LINE連携済みのお客様用チェックインQRです。初回はアンケート、2回目以降はありがとう画面に遷移します。
            </p>
            <div className="flex flex-col items-center gap-4">
              <div id="qr-survey" className="p-4 bg-white rounded-lg border">
                <QRCodeSVG
                  value={surveyUrl}
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="text-center space-y-1">
                <a
                  href={surveyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  URLを開く
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => handlePrint('survey')}
            >
              <Printer className="h-4 w-4 mr-2" />
              印刷する
            </Button>
          </CardContent>
        </Card>

        {/* Guest Registration QR */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              👤 Guest Registration QR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              LINE未所持のお客様（お子様など）用の登録フォームです。LINE連携なしでカルテを作成します。
            </p>
            <div className="flex flex-col items-center gap-4">
              <div id="qr-walkin" className="p-4 bg-white rounded-lg border">
                <QRCodeSVG
                  value={WALKIN_URL}
                  size={180}
                  level="M"
                  includeMargin={false}
                  fgColor="#F59E0B"
                />
              </div>
              <div className="text-center space-y-1">
                <a
                  href={WALKIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  URLを開く
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => handlePrint('walkin')}
            >
              <Printer className="h-4 w-4 mr-2" />
              印刷する
            </Button>
          </CardContent>
        </Card>

        {/* Staff Login QR */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🔐 Staff Login QR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              スタッフがスマートフォンから管理画面にログインするためのQRコードです。
            </p>
            <div className="flex flex-col items-center gap-4">
              <div id="qr-login" className="p-4 bg-white rounded-lg border">
                <QRCodeSVG
                  value={LOGIN_URL}
                  size={180}
                  level="M"
                  includeMargin={false}
                  fgColor="#3B82F6"
                />
              </div>
              <div className="text-center space-y-1">
                <a
                  href={LOGIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  URLを開く
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => handlePrint('login')}
            >
              <Printer className="h-4 w-4 mr-2" />
              印刷する
            </Button>
          </CardContent>
        </Card>

        {/* TimeCard QR */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              ⏰ TimeCard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              スタッフが出勤・退勤する際に読み取るQRコードです。ログイン状態から自動で出勤・退勤を判定します。
            </p>
            <div className="flex flex-col items-center gap-4">
              <div id="qr-labor" className="p-4 bg-white rounded-lg border">
                <QRCodeSVG
                  value={TIMECARD_URL}
                  size={180}
                  level="M"
                  includeMargin={false}
                  fgColor="#8B5CF6"
                />
              </div>
              <div className="text-center space-y-1">
                <a
                  href={TIMECARD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  URLを開く
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => handlePrint('labor')}
            >
              <Printer className="h-4 w-4 mr-2" />
              印刷する
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
