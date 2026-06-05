'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Wifi, Loader2, Plus, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react'
import {
  detectCurrentIp,
  getStoreWifiSettings,
  setStoreWifiEnabled,
  registerCurrentIpForStore,
  removeAllowedIpFromStore,
} from '@/actions/timecard-wifi'
import type { AllowedIp } from '@/lib/ip-check'

interface Props {
  storeId: string
  storeName: string
  onClose: () => void
}

export function WifiPanel({ storeId, storeName, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [allowedIps, setAllowedIps] = useState<AllowedIp[]>([])
  const [currentIp, setCurrentIp] = useState<string | null>(null)
  const [ipLabel, setIpLabel] = useState('')
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  async function load() {
    setLoading(true)
    const [settings, ipRes] = await Promise.all([
      getStoreWifiSettings(storeId),
      detectCurrentIp(),
    ])
    if (settings) {
      setEnabled(settings.enabled)
      setAllowedIps(settings.allowedIps)
    }
    setCurrentIp(ipRes.ip)
    setLoading(false)
  }

  async function handleToggleEnabled() {
    const next = !enabled
    setEnabled(next)
    const res = await setStoreWifiEnabled(storeId, next)
    if (!res.ok) {
      toast.error(res.error || '更新に失敗しました')
      setEnabled(!next)
      return
    }
    toast.success(next ? 'WiFi打刻を有効にしました' : 'WiFi打刻を無効にしました')
  }

  async function handleRegisterCurrentIp() {
    if (!currentIp) {
      toast.error('現在のIPが取得できていません')
      return
    }
    setRegistering(true)
    const res = await registerCurrentIpForStore(storeId, ipLabel || undefined)
    setRegistering(false)
    if (!res.ok) {
      toast.error(res.error || '登録に失敗しました')
      return
    }
    toast.success(`このIP (${res.ip}) を店舗WiFiとして登録しました`)
    setIpLabel('')
    void load()
  }

  async function handleRemove(ip: string) {
    const res = await removeAllowedIpFromStore(storeId, ip)
    if (!res.ok) {
      toast.error(res.error || '削除に失敗しました')
      return
    }
    toast.success(`IP ${ip} を削除しました`)
    void load()
  }

  const isCurrentIpAlreadyRegistered =
    !!currentIp && allowedIps.some((a) => a.ip === currentIp)

  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wifi className="h-5 w-5 text-emerald-600" />
            WiFi打刻設定 - {storeName}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            閉じる
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          スタッフが「店舗WiFiに接続中」のときだけ、LINEから打刻できる仕組みです。
          ブラウザは WiFi名（SSID）を取得できないため、店舗ルーターの<b>公開IPアドレス</b>を許可リストとして登録します。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* 有効/無効トグル */}
            <div className="flex items-center justify-between p-3 rounded-md border bg-white">
              <div className="flex items-center gap-2">
                {enabled ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                )}
                <span className="text-sm font-semibold">
                  WiFi打刻 {enabled ? '有効' : '無効'}
                </span>
              </div>
              <Button
                size="sm"
                variant={enabled ? 'outline' : 'default'}
                onClick={handleToggleEnabled}
              >
                {enabled ? '無効にする' : '有効にする'}
              </Button>
            </div>

            {!enabled && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                ⚠️ 無効中はWiFi(IP)による検証はスキップされます。QR+GPS打刻は引き続き有効です。
              </p>
            )}

            {/* 現在の自分のIP */}
            <div className="space-y-2 p-3 rounded-md border bg-stone-50">
              <Label className="text-xs font-semibold">
                あなたが今アクセスしているIP（このIPを登録できます）
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white border rounded font-mono text-sm">
                  {currentIp || '取得できませんでした'}
                </code>
                {isCurrentIpAlreadyRegistered && (
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300">
                    登録済
                  </Badge>
                )}
              </div>

              {currentIp && !isCurrentIpAlreadyRegistered && (
                <div className="space-y-2 pt-2">
                  <Input
                    placeholder="ラベル（例: 店舗光回線）省略可"
                    value={ipLabel}
                    onChange={(e) => setIpLabel(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    onClick={handleRegisterCurrentIp}
                    disabled={registering}
                    className="w-full"
                  >
                    {registering ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    このIPを店舗WiFiとして登録する
                  </Button>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    ※ 店舗のWiFiに接続した状態で操作してください。
                    モバイル通信（4G/5G）で操作するとモバイル回線のIPが登録されてしまいます。
                  </p>
                </div>
              )}
            </div>

            {/* 登録済IPリスト */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                登録済みIP（最大5件、上限超過時は最終アクセス日時の古いものから自動削除）
              </Label>
              {allowedIps.length === 0 ? (
                <p className="text-xs text-muted-foreground italic p-3 border rounded-md bg-white">
                  まだ登録されていません
                </p>
              ) : (
                <div className="space-y-1.5">
                  {allowedIps.map((a) => (
                    <div
                      key={a.ip}
                      className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white"
                    >
                      <code className="font-mono text-sm flex-shrink-0">{a.ip}</code>
                      {a.label && (
                        <span className="text-xs text-muted-foreground truncate">
                          ({a.label})
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground whitespace-nowrap">
                        <span>登録: {formatDate(a.registered_at)}</span>
                        {a.last_seen_at && (
                          <span>最終: {formatDate(a.last_seen_at)}</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemove(a.ip)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 注意書き */}
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-blue-900">💡 動的IPの店舗向けヒント</p>
              <ul className="text-[11px] text-blue-800 space-y-1 list-disc pl-4 leading-relaxed">
                <li>通常の光回線は2週間〜数ヶ月ごとにIPが変わることがあります</li>
                <li>WiFi打刻が突然できなくなったら、この画面で「現在のIP」を再登録</li>
                <li>古いIPは自動的に押し出されます（最大5件保持）</li>
                <li>固定IPオプションを契約すれば再登録不要になります（月額数百〜千円）</li>
                <li>WiFi打刻NGの時は、QR+GPS打刻が引き続き使えます</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return '-'
  }
}
