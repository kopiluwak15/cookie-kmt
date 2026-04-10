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
import { QrCode, RefreshCw, Loader2, Search, Users } from 'lucide-react'
import { CustomerSearch } from '@/components/features/customer-search'
import { getTodayCheckedInCustomers } from '@/actions/customers'
import { issueKarteViewUrl } from '@/actions/karte-view'

type CustomerResult = {
  id: string
  customer_code: string
  name: string
  name_kana: string | null
  phone: string | null
  last_visit_date: string | null
  line_user_id: string | null
}

export function KarteQrClient() {
  const [checkedIn, setCheckedIn] = useState<CustomerResult[]>([])
  const [loaded, setLoaded] = useState(false)
  const [refreshing, startRefresh] = useTransition()
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrCustomerName, setQrCustomerName] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const [issuing, setIssuing] = useState<string | null>(null)
  const [searchCustomer, setSearchCustomer] = useState<CustomerResult | null>(null)

  const loadCheckedIn = () => {
    startRefresh(async () => {
      const data = await getTodayCheckedInCustomers()
      setCheckedIn(data)
      setLoaded(true)
    })
  }

  // 初回ロード
  if (!loaded && !refreshing) {
    loadCheckedIn()
  }

  const handleShowQr = async (customerId: string, customerName: string) => {
    setIssuing(customerId)
    const res = await issueKarteViewUrl(customerId)
    setIssuing(null)
    if (res.ok) {
      setQrUrl(res.url)
      setQrCustomerName(customerName)
      setQrOpen(true)
    }
  }

  return (
    <>
      <Tabs defaultValue="checkedin" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="checkedin">
              <Users className="h-3 w-3 mr-1" />
              本日チェックイン
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="h-3 w-3 mr-1" />
              顧客検索
            </TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={loadCheckedIn}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            <span className="ml-1">更新</span>
          </Button>
        </div>

        {/* チェックイン済み一覧 */}
        <TabsContent value="checkedin">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">本日チェックイン済みの顧客</CardTitle>
              <p className="text-xs text-muted-foreground">
                タップでQRコードを表示します
              </p>
            </CardHeader>
            <CardContent>
              {!loaded ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : checkedIn.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  本日チェックインした顧客はいません
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {checkedIn.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleShowQr(c.id, c.name)}
                      disabled={issuing === c.id}
                      className="flex items-center gap-3 p-3 border rounded-md bg-card hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{c.name}</span>
                          {c.customer_code && (
                            <span className="text-xs text-muted-foreground">{c.customer_code}</span>
                          )}
                        </div>
                        {c.name_kana && (
                          <p className="text-xs text-muted-foreground">{c.name_kana}</p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {issuing === c.id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : (
                          <QrCode className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 顧客検索 */}
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">顧客を検索してQR表示</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CustomerSearch
                onSelect={(c) => setSearchCustomer(c)}
                selectedCustomer={searchCustomer}
              />
              {searchCustomer && (
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                  <div>
                    <span className="font-semibold">{searchCustomer.name}</span>
                    {searchCustomer.customer_code && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {searchCustomer.customer_code}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleShowQr(searchCustomer.id, searchCustomer.name)}
                    disabled={issuing === searchCustomer.id}
                  >
                    {issuing === searchCustomer.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <QrCode className="h-3 w-3" />
                    )}
                    <span className="ml-1">QR表示</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QRダイアログ */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{qrCustomerName} 様のカルテ</DialogTitle>
            <DialogDescription className="text-xs">
              スタッフのスマートフォンで読み取ると、LINE認証＋GPS確認後にカルテを閲覧できます。
              <br />
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
              <p className="text-[10px] text-muted-foreground break-all text-center max-w-[280px]">
                {qrUrl}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
