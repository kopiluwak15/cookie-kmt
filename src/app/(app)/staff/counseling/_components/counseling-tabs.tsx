'use client'

import { useState, useTransition } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { QRCodeSVG } from 'qrcode.react'
import { Send, QrCode, RefreshCw, Loader2 } from 'lucide-react'
import {
  sendConceptResurveyLine,
  issueCounselingTokenUrl,
  getCheckedInPendingCustomers,
  type PendingCheckedInCustomer,
} from '@/actions/counseling'

interface Props {
  initialCustomers: PendingCheckedInCustomer[]
}

export function CounselingTabs({ initialCustomers }: Props) {
  const [customers, setCustomers] = useState<PendingCheckedInCustomer[]>(initialCustomers)
  const [refreshing, startRefresh] = useTransition()

  const refresh = () => {
    startRefresh(async () => {
      const fresh = await getCheckedInPendingCustomers()
      setCustomers(fresh)
    })
  }

  return (
    <Tabs defaultValue="resurvey" className="space-y-4">
      <TabsList>
        <TabsTrigger value="resurvey">アンケート再送</TabsTrigger>
      </TabsList>

      <TabsContent value="resurvey" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">本日チェックイン済み（施術ログ未入力）</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                施術完了前のお客様のみ表示しています
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="ml-1">更新</span>
            </Button>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                該当するお客様はいません
              </p>
            ) : (
              <div className="space-y-2">
                {customers.map((c) => (
                  <CustomerRow key={c.id} customer={c} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function CustomerRow({ customer }: { customer: PendingCheckedInCustomer }) {
  const [sending, setSending] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [issuing, setIssuing] = useState(false)

  const lineDisabled = !customer.line_user_id || customer.line_blocked

  const handleSendLine = async () => {
    if (sending) return
    setSending(true)
    setSentMessage(null)
    setErrorMessage(null)
    const res = await sendConceptResurveyLine(customer.id)
    if (res.ok) {
      setSentMessage('LINEを送信しました')
    } else {
      setErrorMessage(res.error)
    }
    setSending(false)
  }

  const handleShowQr = async () => {
    setIssuing(true)
    setErrorMessage(null)
    const res = await issueCounselingTokenUrl(customer.id)
    setIssuing(false)
    if (res.ok) {
      setQrUrl(res.url)
      setQrOpen(true)
    } else {
      setErrorMessage(res.error)
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 border rounded-md bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold truncate">{customer.name}</span>
          {customer.customer_code && (
            <span className="text-xs text-muted-foreground">{customer.customer_code}</span>
          )}
          {!customer.line_user_id ? (
            <Badge variant="secondary" className="text-[10px]">LINE未登録</Badge>
          ) : customer.line_blocked ? (
            <Badge variant="destructive" className="text-[10px]">ブロック中</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">LINE有効</Badge>
          )}
        </div>
        {sentMessage && (
          <p className="text-xs text-emerald-600 mt-1">{sentMessage}</p>
        )}
        {errorMessage && (
          <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={handleSendLine}
          disabled={sending || lineDisabled}
          title={lineDisabled ? 'LINE未登録 / ブロック中のため送信できません' : ''}
        >
          {sending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          <span className="ml-1 text-xs">LINEで送る</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleShowQr}
          disabled={issuing}
        >
          {issuing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <QrCode className="h-3 w-3" />
          )}
          <span className="ml-1 text-xs">QRで渡す</span>
        </Button>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{customer.name} 様 用 QR</DialogTitle>
            <DialogDescription className="text-xs">
              お客様のスマートフォンで読み取っていただくと、アンケート画面が開きます。<br />
              （有効期限: 24時間）
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrUrl && (
              <div className="bg-white p-4 rounded-md border">
                <QRCodeSVG value={qrUrl} size={220} level="M" />
              </div>
            )}
            {qrUrl && (
              <p className="text-[10px] text-muted-foreground break-all text-center">
                {qrUrl}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
