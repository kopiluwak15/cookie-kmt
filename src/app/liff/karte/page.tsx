'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, MapPinOff, AlertCircle, ShieldAlert, User, ArrowLeft, Search } from 'lucide-react'
import { CustomerDetailTabs } from '@/app/(app)/admin/customers/[id]/_components/customer-detail-tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import type { CaseRecord } from '@/types'

type StoreGps = {
  latitude: number | null
  longitude: number | null
  gps_radius_meters: number
  gps_enabled: boolean
}

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

function haversineMeters(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export default function LiffKartePage() {
  return (
    <Suspense
      fallback={
        <main className="bg-gradient-to-b from-gray-50 to-white flex items-center justify-center" style={{ minHeight: '100dvh' }}>
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </main>
      }
    >
      <LiffKarteInner />
    </Suspense>
  )
}

type Phase = 'loading' | 'gps_checking' | 'search' | 'viewing' | 'error'

function LiffKarteInner() {
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('loading')
  const [message, setMessage] = useState('認証確認中...')
  const [error, setError] = useState('')
  const [errorIcon, setErrorIcon] = useState<'alert' | 'gps' | 'shield'>('alert')
  const [lineUserId, setLineUserId] = useState('')

  // 顧客検索
  const [query, setQuery] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  // カルテ表示
  const [karteData, setKarteData] = useState<KarteData | null>(null)
  const [loadingKarte, setLoadingKarte] = useState(false)

  // 初期化: LINE認証 + GPS
  useEffect(() => {
    const init = async () => {
      try {
        const lid = searchParams?.get('lid') ||
          (typeof window !== 'undefined' ? sessionStorage.getItem('liff_line_user_id') || '' : '')

        if (!lid) {
          setErrorIcon('alert')
          setError('LINE認証情報が取得できませんでした。\nLINEから再度QRコードを読み取ってください。')
          setPhase('error')
          return
        }
        setLineUserId(lid)

        // スタッフ確認 + GPS情報取得
        setMessage('スタッフ情報を確認中...')
        const res = await fetch('/api/karte-view/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineUserId: lid }),
        })
        const json = await res.json()

        if (!res.ok) {
          if (res.status === 403) {
            setErrorIcon('shield')
            setError('スタッフとして登録されていないため\nカルテを閲覧できません。')
          } else {
            setErrorIcon('alert')
            setError(json.error || '認証に失敗しました')
          }
          setPhase('error')
          return
        }

        const store = json.store as StoreGps | null

        // GPS検証
        if (store?.gps_enabled && store.latitude != null && store.longitude != null) {
          setPhase('gps_checking')
          setMessage('位置情報を確認中...')

          if (!navigator.geolocation) {
            setErrorIcon('gps')
            setError('この端末は位置情報に対応していません。\n店舗内でのみカルテを閲覧できます。')
            setPhase('error')
            return
          }

          const gpsResult = await new Promise<{ ok: boolean; distance?: number; error?: string }>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const dist = haversineMeters(
                  pos.coords.latitude, pos.coords.longitude,
                  store.latitude!, store.longitude!
                )
                resolve({ ok: dist <= store.gps_radius_meters, distance: dist })
              },
              (err) => {
                resolve({ ok: false, error: err.message || '位置情報取得に失敗しました' })
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            )
          })

          if (!gpsResult.ok) {
            setErrorIcon('gps')
            if (gpsResult.error) {
              setError(`位置情報の取得に失敗しました。\n${gpsResult.error}\n\n店舗内でのみカルテを閲覧できます。`)
            } else {
              setError(`店舗の範囲外です（${Math.round(gpsResult.distance!)}m）。\n店舗内でのみカルテを閲覧できます。`)
            }
            setPhase('error')
            return
          }
        }

        // 認証+GPS OK → 検索画面へ
        setPhase('search')
      } catch (err) {
        console.error('karte auth error:', err)
        setErrorIcon('alert')
        setError(err instanceof Error ? err.message : '初期化に失敗しました')
        setPhase('error')
      }
    }
    init()
  }, [searchParams])

  // 顧客検索
  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (q.trim().length < 1) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch('/api/karte-view/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId, query: q.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.customers || [])
      }
    } catch (e) {
      console.error('search failed', e)
    } finally {
      setSearching(false)
    }
  }, [lineUserId])

  // 顧客カルテ取得
  const viewCustomer = useCallback(async (customerId: string) => {
    setLoadingKarte(true)
    try {
      const res = await fetch('/api/karte-view/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId, customerId }),
      })
      if (res.ok) {
        const data = await res.json()
        setKarteData(data)
        setPhase('viewing')
      }
    } catch (e) {
      console.error('karte fetch failed', e)
    } finally {
      setLoadingKarte(false)
    }
  }, [lineUserId])

  const backToSearch = () => {
    setKarteData(null)
    setPhase('search')
  }

  // エラー画面
  if (phase === 'error') {
    const Icon = errorIcon === 'gps' ? MapPinOff : errorIcon === 'shield' ? ShieldAlert : AlertCircle
    const iconColor = errorIcon === 'gps' ? 'text-orange-500' : 'text-red-500'

    return (
      <main className="bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6" style={{ minHeight: '100dvh' }}>
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <Icon className={`h-12 w-12 ${iconColor} mx-auto mb-4`} />
          <h2 className="text-lg font-bold text-gray-900 mb-3">カルテを表示できません</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            もう一度試す
          </button>
        </div>
      </main>
    )
  }

  // ローディング
  if (phase === 'loading' || phase === 'gps_checking') {
    return (
      <main className="bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6" style={{ minHeight: '100dvh' }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-sm text-gray-700 font-medium">{message}</p>
        </div>
      </main>
    )
  }

  // 顧客検索画面
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

        <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="名前・フリガナ・顧客コードで検索"
              className="pl-9 h-11 text-base"
              autoFocus
            />
          </div>

          {searching && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!searching && query.trim().length > 0 && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
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

  // カルテ表示
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
