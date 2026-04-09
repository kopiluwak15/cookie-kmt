'use client'

import { useEffect, useState } from 'react'
import { getStores, createStore, updateStore } from '@/actions/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Building2, Plus, Power, MapPin, Loader2 } from 'lucide-react'
import type { Store } from '@/types'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

function getDemoStores(): Store[] {
  return [
    { id: 'demo-1', name: '渋谷店', store_code: 'SHIBUYA', address: '東京都渋谷区神宮前1-1-1', phone: '03-1234-5678', is_active: true, created_at: '2024-01-01T00:00:00Z' },
    { id: 'demo-2', name: '新宿店', store_code: 'SHINJUKU', address: '東京都新宿区西新宿2-2-2', phone: '03-9876-5432', is_active: true, created_at: '2024-06-01T00:00:00Z' },
  ]
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // GPS設定
  const [gpsEditId, setGpsEditId] = useState<string | null>(null)
  const [gpsLat, setGpsLat] = useState('')
  const [gpsLng, setGpsLng] = useState('')
  const [gpsRadius, setGpsRadius] = useState('50')
  const [savingGps, setSavingGps] = useState(false)
  const [fetchingGps, setFetchingGps] = useState(false)

  useEffect(() => {
    loadStores()
  }, [])

  async function loadStores() {
    if (!isSupabaseConfigured) {
      setStores(getDemoStores())
      return
    }
    try {
      const data = await getStores()
      setStores(data as Store[])
    } catch {
      toast.error('店舗データの取得に失敗しました')
    }
  }

  async function handleCreate(formData: FormData) {
    setSubmitting(true)
    try {
      if (!isSupabaseConfigured) {
        toast.success('（デモ）店舗が作成されました')
        setDialogOpen(false)
        setSubmitting(false)
        return
      }

      const result = await createStore(formData)
      if (result?.error) {
        toast.error(result.error)
        setSubmitting(false)
        return
      }
      toast.success('店舗が作成されました')
      setDialogOpen(false)
      await loadStores()
    } catch {
      toast.error('作成中にエラーが発生しました')
    }
    setSubmitting(false)
  }

  function startGpsEdit(store: any) {
    setGpsEditId(store.id)
    setGpsLat(store.latitude?.toString() || '')
    setGpsLng(store.longitude?.toString() || '')
    setGpsRadius(store.gps_radius_meters?.toString() || '50')
  }

  async function handleFetchCurrentLocation() {
    setFetchingGps(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      })
      setGpsLat(pos.coords.latitude.toFixed(6))
      setGpsLng(pos.coords.longitude.toFixed(6))
      toast.success('現在地を取得しました')
    } catch {
      toast.error('位置情報を取得できませんでした')
    } finally {
      setFetchingGps(false)
    }
  }

  async function handleSaveGps() {
    if (!gpsEditId) return
    const lat = gpsLat ? parseFloat(gpsLat) : null
    const lng = gpsLng ? parseFloat(gpsLng) : null
    const radius = parseInt(gpsRadius) || 50

    if ((lat !== null && isNaN(lat)) || (lng !== null && isNaN(lng))) {
      toast.error('緯度・経度は数値で入力してください')
      return
    }

    setSavingGps(true)
    try {
      await updateStore(gpsEditId, {
        latitude: lat,
        longitude: lng,
        gps_radius_meters: radius,
      })
      toast.success('GPS設定を保存しました')
      setGpsEditId(null)
      await loadStores()
    } catch (err: any) {
      toast.error(`GPS設定の保存に失敗しました: ${err?.message || '不明なエラー'}`)
    } finally {
      setSavingGps(false)
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    if (!isSupabaseConfigured) {
      toast.success(`（デモ）店舗を${currentActive ? '無効' : '有効'}にしました`)
      return
    }
    try {
      await updateStore(id, { is_active: !currentActive })
      toast.success(`店舗を${currentActive ? '無効' : '有効'}にしました`)
      await loadStores()
    } catch {
      toast.error('更新に失敗しました')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            店舗管理
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            店舗の登録・管理を行います
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gray-900 hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              新規店舗追加
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>新規店舗追加</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">店舗名 *</Label>
                <Input id="name" name="name" required placeholder="渋谷店" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store_code">店舗コード *</Label>
                <Input id="store_code" name="store_code" required placeholder="SHIBUYA" />
                <p className="text-xs text-muted-foreground">英数字の短い識別子（自動的に大文字に変換されます）</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">住所</Label>
                <Input id="address" name="address" placeholder="東京都渋谷区..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">電話番号</Label>
                <Input id="phone" name="phone" placeholder="03-1234-5678" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={submitting} className="bg-gray-900 hover:bg-gray-800">
                  {submitting ? '作成中...' : '作成する'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>店舗一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>店舗名</TableHead>
                <TableHead>店舗コード</TableHead>
                <TableHead>住所</TableHead>
                <TableHead>電話番号</TableHead>
                <TableHead>GPS</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    店舗が登録されていません
                  </TableCell>
                </TableRow>
              ) : (
                stores.map((store) => (
                  <TableRow key={store.id} className={!store.is_active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{store.store_code}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {store.address || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {store.phone || '-'}
                    </TableCell>
                    <TableCell>
                      {(store as any).latitude ? (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">
                          {(store as any).gps_radius_meters || 50}m
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">未設定</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {store.is_active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">有効</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500">無効</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startGpsEdit(store)}
                          title="GPS設定"
                        >
                          <MapPin className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(store.id, store.is_active)}
                          title={store.is_active ? '無効にする' : '有効にする'}
                        >
                          <Power className={`h-4 w-4 ${store.is_active ? 'text-red-500' : 'text-green-500'}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* GPS設定パネル */}
      {gpsEditId && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              GPS設定 - {stores.find(s => s.id === gpsEditId)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleFetchCurrentLocation}
              disabled={fetchingGps}
              variant="outline"
              size="sm"
            >
              {fetchingGps ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              現在地から取得
            </Button>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>緯度</Label>
                <Input
                  value={gpsLat}
                  onChange={(e) => setGpsLat(e.target.value)}
                  placeholder="35.681236"
                />
              </div>
              <div className="space-y-2">
                <Label>経度</Label>
                <Input
                  value={gpsLng}
                  onChange={(e) => setGpsLng(e.target.value)}
                  placeholder="139.767125"
                />
              </div>
              <div className="space-y-2">
                <Label>許容半径 (m)</Label>
                <Input
                  type="number"
                  value={gpsRadius}
                  onChange={(e) => setGpsRadius(e.target.value)}
                  min="10"
                  max="1000"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              ※ GPS精度は屋内で10〜30mの誤差があります。50m以上を推奨します。
            </p>

            <div className="flex gap-2">
              <Button onClick={handleSaveGps} disabled={savingGps}>
                {savingGps ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                保存
              </Button>
              <Button variant="outline" onClick={() => setGpsEditId(null)}>
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
