'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Smartphone, Loader2, Search, ArrowLeft, RefreshCw, MapPinOff, ShieldAlert, AlertCircle, User } from 'lucide-react'
import { CustomerDetailTabs } from '@/app/(app)/admin/customers/[id]/_components/customer-detail-tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { CaseRecord } from '@/types'

type Phase = 'qr' | 'search' | 'viewing'

type CustomerBasic = {
  id: string
  customer_code: string | null
  name: string
  name_kana: string | null
  phone: string | null
  birthday: string | null
  notes: string | null
  individual_cycle_days: number | null
  first_visit_date: string | null
  last_visit_date: string | null
  total_visits: number
  visit_motivation: string | null
  line_user_id: string | null
  line_blocked: boolean
}

type KarteData = {
  customer: CustomerBasic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visits: any[]
  caseRecords: CaseRecord[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  karteIntakes: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conceptIntakes: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineHistory: any[]
}

export default function KarteQrPage() {
  const [phase, setPhase] = useState<Phase>('qr')
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [sessionCode, setSessionCode] = useState('')
  const [staffLineUserId, setStaffLineUserId] = useState('')
  const [expired, setExpired] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 顧客検索
  const [query, setQuery] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // カルテ表示
  const [karteData, setKarteData] = useState<KarteData | null>(null)
  const [loadingKarte, setLoadingKarte] = useState(false)

  // セッション作成 + QR生成 + ポーリング開始
  const createSession = useCallback(async () => {
    setExpired(false)
    setQrUrl(null)
    setPhase('qr')

    // 古いポーリング停止
    if (pollRef.current) clearInterval(pollRef.current)

    try {
      const res = await fetch('/api/karte-view/session/create', { method: 'POST' })
      const data = await res.json()
      if (!data.sessionCode) return

      const code = data.sessionCode
      setSessionCode(code)

      const liffId = process.env.NEXT_PUBLIC_LIFF_ID
      const appUrl = window.location.origin
      const url = liffId
        ? `https://liff.line.me/${liffId}?mode=karte&sc=${code}`
        : `${appUrl}/liff/welcome?mode=karte&sc=${code}`
      setQrUrl(url)

      // ポーリング開始（3秒間隔）
      pollRef.current = setInterval(async () => {
        try {
          const checkRes = await fetch('/api/karte-view/session/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionCode: code }),
          })
          const checkData = await checkRes.json()

          if (checkData.expired) {
            setExpired(true)
            if (pollRef.current) clearInterval(pollRef.current)
            return
          }

          if (checkData.authenticated && checkData.staffLineUserId) {
            if (pollRef.current) clearInterval(pollRef.current)
            setStaffLineUserId(checkData.staffLineUserId)
            setPhase('search')
          }
        } catch {
          // ネットワークエラーは無視して次回再試行
        }
      }, 3000)
    } catch (err) {
      console.error('create session failed:', err)
    }
  }, [])

  // 初回セッション作成
  useEffect(() => {
    createSession()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [createSession])

  // 顧客検索（デバウンス）
  const handleQueryChange = useCallback((q: string) => {
    setQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)

    if (q.trim().length < 1) {
      setSearchResults([])
      return
    }

    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch('/api/karte-view/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineUserId: staffLineUserId, query: q.trim() }),
        })
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.customers || [])
        }
      } catch {
        // ignore
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [staffLineUserId])

  // カルテ取得
  const viewCustomer = useCallback(async (customerId: string) => {
    setLoadingKarte(true)
    try {
      const res = await fetch('/api/karte-view/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId: staffLineUserId, customerId }),
      })
      if (res.ok) {
        const data = await res.json()
        setKarteData(data)
        setPhase('viewing')
      }
    } catch {
      // ignore
    } finally {
      setLoadingKarte(false)
    }
  }, [staffLineUserId])

  const backToSearch = () => {
    setKarteData(null)
    setPhase('search')
  }

  // ============ QR画面 ============
  if (phase === 'qr') {
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

          {qrUrl && !expired ? (
            <>
              <div className="bg-white p-6 rounded-xl border shadow-sm inline-block">
                <QRCodeSVG value={qrUrl} size={240} level="M" />
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-amber-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>認証待ち…</span>
              </div>
            </>
          ) : expired ? (
            <div className="space-y-4">
              <p className="text-sm text-red-600">QRの有効期限が切れました</p>
              <Button onClick={createSession} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                QRを更新する
              </Button>
            </div>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
          )}

          <div className="space-y-1 text-xs text-gray-500">
            <p>LINE認証＋GPS確認後にこの画面が切り替わります</p>
            <p>※ スタッフアカウントが必要です</p>
            <p>※ 店舗内でのみ閲覧可能です</p>
          </div>

          {qrUrl && !expired && (
            <Button variant="outline" size="sm" onClick={createSession} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              QRを更新
            </Button>
          )}
        </div>
      </main>
    )
  }

  // ============ 顧客検索画面 ============
  if (phase === 'search') {
    return (
      <main className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-amber-600" />
            <span className="font-bold text-lg">顧客カルテ閲覧</span>
            <Badge variant="outline" className="text-[10px] ml-auto">閲覧専用</Badge>
          </div>
        </div>

        <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="名前・フリガナ・顧客コードで検索"
              className="pl-9 h-12 text-base"
              autoFocus
            />
          </div>

          {searching && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!searching && query.trim().length > 0 && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              該当する顧客が見つかりません
            </p>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => viewCustomer(c.id)}
                  disabled={loadingKarte}
                  className="flex items-center gap-3 w-full p-4 border rounded-lg bg-white hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{c.name}</span>
                      {c.customer_code && (
                        <span className="text-xs text-muted-foreground">{c.customer_code}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {c.name_kana && <span>{c.name_kana}</span>}
                      {c.last_visit_date && <span>最終来店: {c.last_visit_date}</span>}
                      {c.total_visits != null && <span>{c.total_visits}回来店</span>}
                    </div>
                  </div>
                  {loadingKarte ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                  ) : (
                    <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0 rotate-180" />
                  )}
                </button>
              ))}
            </div>
          )}

          {query.trim().length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              顧客名またはコードを入力して検索してください
            </p>
          )}
        </div>
      </main>
    )
  }

  // ============ カルテ閲覧画面 ============
  if (phase === 'viewing' && karteData) {
    const c = karteData.customer
    return (
      <main className="bg-gray-50 min-h-screen pb-8">
        <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={backToSearch}
              className="p-1 -ml-1 hover:bg-muted rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="font-bold text-lg">{c.name}</span>
            {c.customer_code && (
              <span className="text-xs text-muted-foreground">{c.customer_code}</span>
            )}
            <Badge variant="outline" className="text-[10px] ml-auto">閲覧専用</Badge>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4 max-w-3xl mx-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">基本情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">フリガナ</span>
                  <p className="font-medium">{c.name_kana || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">来店回数</span>
                  <p className="font-medium">{c.total_visits}回</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">初回来店</span>
                  <p className="font-medium">{c.first_visit_date || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">最終来店</span>
                  <p className="font-medium">{c.last_visit_date || '-'}</p>
                </div>
                {c.visit_motivation && (
                  <div>
                    <span className="text-muted-foreground text-xs">来店経路</span>
                    <p className="font-medium">{c.visit_motivation}</p>
                  </div>
                )}
                {c.individual_cycle_days && (
                  <div>
                    <span className="text-muted-foreground text-xs">来店周期</span>
                    <p className="font-medium">{c.individual_cycle_days}日</p>
                  </div>
                )}
              </div>
              {c.notes && (
                <>
                  <Separator className="my-3" />
                  <div>
                    <span className="text-xs text-muted-foreground">メモ</span>
                    <p className="text-sm mt-0.5">{c.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <CustomerDetailTabs
            visits={karteData.visits}
            caseRecords={karteData.caseRecords}
            lineHistory={karteData.lineHistory}
            karteIntakes={karteData.karteIntakes}
            conceptIntakes={karteData.conceptIntakes}
            customerName={c.name}
            isSupabaseConfigured={false}
          />
        </div>
      </main>
    )
  }

  return null
}
