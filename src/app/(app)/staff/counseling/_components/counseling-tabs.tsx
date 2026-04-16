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
import { Send, QrCode, RefreshCw, Loader2, ChevronDown, ChevronUp, ClipboardList, FileText } from 'lucide-react'
import {
  sendConceptResurveyLine,
  issueCounselingTokenUrl,
  getCheckedInPendingCustomers,
  getCheckedInCustomersWithKarte,
  type PendingCheckedInCustomer,
  type CheckedInCustomerWithKarte,
} from '@/actions/counseling'

/** カルテ作成時のカテゴリーキー → 日本語ラベル */
const MENU_CATEGORY_LABELS: Record<string, string> = {
  kaizen: '髪質改善 / 縮毛矯正',
  consult: 'ご相談 / おまかせ',
  regular: 'ヘアカット / カラー / パーマ / トリートメント',
  care: 'メンテナンス / ヘッドスパ / ヘアセット / メイク',
  product: '店内商品購入',
}

/** 気になる部位 ID → 日本語ラベル */
const SPOT_LABELS: Record<string, string> = {
  'f-top': 'トップ（前）',
  'f-bangs': '前髪',
  'f-side-l': 'サイド左（前）',
  'f-side-r': 'サイド右（前）',
  'f-face-l': '顔周り左',
  'f-face-r': '顔周り右',
  'f-sideburn': 'もみあげ',
  'b-top': 'トップ（後）',
  'b-side-l': 'サイド左（後）',
  'b-side-r': 'サイド右（後）',
  'b-back': '後頭部',
  'b-nape': '襟足',
}

function resolveSelectedMenuTags(karte: Record<string, unknown>): string[] {
  const sm = karte.selected_menus as string[] | undefined
  if (sm && sm.length > 0) return sm.map((k) => MENU_CATEGORY_LABELS[k] || k)
  const raw = karte.raw as Record<string, unknown> | null | undefined
  const keys = raw?.selectedMenus as string[] | undefined
  if (!keys || keys.length === 0) return []
  return keys.map((k) => MENU_CATEGORY_LABELS[k] || k)
}

function resolveSpotLabels(spots: string[]): string[] {
  return spots.map((s) => SPOT_LABELS[s] || s)
}

interface Props {
  initialCustomers: PendingCheckedInCustomer[]
  initialKarteCustomers: CheckedInCustomerWithKarte[]
}

export function CounselingTabs({ initialCustomers, initialKarteCustomers }: Props) {
  const [customers, setCustomers] = useState<PendingCheckedInCustomer[]>(initialCustomers)
  const [karteCustomers, setKarteCustomers] = useState<CheckedInCustomerWithKarte[]>(initialKarteCustomers)
  const [refreshing, startRefresh] = useTransition()

  const refresh = () => {
    startRefresh(async () => {
      const [fresh, freshKarte] = await Promise.all([
        getCheckedInPendingCustomers(),
        getCheckedInCustomersWithKarte(),
      ])
      setCustomers(fresh)
      setKarteCustomers(freshKarte)
    })
  }

  return (
    <Tabs defaultValue="karte" className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="karte">
            <ClipboardList className="h-3 w-3 mr-1" />
            カルテ
          </TabsTrigger>
          <TabsTrigger value="resurvey">
            <FileText className="h-3 w-3 mr-1" />
            アンケート再送
          </TabsTrigger>
        </TabsList>
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
      </div>

      {/* カルテタブ */}
      <TabsContent value="karte" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">本日チェックイン済みのカルテ・お悩みアンケート</CardTitle>
            <p className="text-xs text-muted-foreground">
              お客様が入力したカルテと悩みアンケートの内容を確認できます
            </p>
          </CardHeader>
          <CardContent>
            {karteCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                本日カルテを入力したお客様はいません
              </p>
            ) : (
              <div className="space-y-2">
                {karteCustomers.map((c) => (
                  <KarteRow key={c.id} customer={c} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* アンケート再送タブ */}
      <TabsContent value="resurvey" className="space-y-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-base">本日チェックイン済み（施術ログ未入力）</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                施術完了前のお客様のみ表示しています
              </p>
            </div>
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

// ============================================
// カルテ展開行
// ============================================
function KarteRow({ customer }: { customer: CheckedInCustomerWithKarte }) {
  const [open, setOpen] = useState(false)
  const k = customer.karte
  const c = customer.concept

  return (
    <div className="border rounded-md bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold">{customer.name}</span>
          {customer.customer_code && (
            <span className="text-xs text-muted-foreground">{customer.customer_code}</span>
          )}
          {k && <Badge variant="outline" className="text-[10px]">カルテ</Badge>}
          {c && <Badge variant="secondary" className="text-[10px]">お悩み</Badge>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-4 bg-muted/10">
          {/* カルテ (karte_intake) */}
          {k && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold flex items-center gap-1">
                <ClipboardList className="h-4 w-4" /> カルテ情報
              </h4>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <LabelValue label="来店経路" value={k.visit_route || '未選択'} />
                <LabelTagsOrEmpty label="本日のご希望" tags={k.todays_wish} />
                <LabelTagsOrEmpty label="施術履歴" tags={k.history} />
                <LabelTagsOrEmpty label="お悩み" tags={k.worries} extra={k.worries_other} />
                <LabelTagsOrEmpty label="来店理由" tags={k.reasons} extra={k.reasons_other} />
                <LabelValue label="なりたい印象" value={k.stay_style_other || k.stay_style || '未選択'} />
                <LabelTagsOrEmpty label="苦手なこと" tags={k.dislikes} extra={k.dislikes_other} />
                <LabelTagsOrEmpty label="気になる部位" tags={resolveSpotLabels(k.spots || [])} />
                <LabelTagsOrEmpty label="希望メニュー" tags={resolveSelectedMenuTags(k)} />
              </div>
            </div>
          )}

          {/* お悩みアンケート (concept_intake) */}
          {c && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold flex items-center gap-1">
                <FileText className="h-4 w-4" /> お悩みアンケート
              </h4>
              <div className="grid grid-cols-1 gap-2 text-xs">
                {c.symptoms?.length > 0 && (
                  <LabelTags label="症状" tags={c.symptoms} extra={c.symptoms_other} />
                )}
                {c.life_impacts?.length > 0 && (
                  <LabelTags label="生活への影響" tags={c.life_impacts} extra={c.life_other} />
                )}
                {c.psychology?.length > 0 && <LabelTags label="心理状態" tags={c.psychology} />}
                {c.past_experiences?.length > 0 && <LabelTags label="過去の経験" tags={c.past_experiences} />}
                {c.success_criteria?.length > 0 && (
                  <LabelTags label="成功条件" tags={c.success_criteria} extra={c.success_free} />
                )}
                {c.priorities?.length > 0 && <LabelTags label="優先順位" tags={c.priorities} />}
                {c.worries_free && <LabelValue label="その他悩み" value={c.worries_free} />}
              </div>
            </div>
          )}

          {!k && !c && (
            <p className="text-xs text-muted-foreground">データがありません</p>
          )}
        </div>
      )}
    </div>
  )
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-medium text-muted-foreground">{label}：</span>
      <span>{value}</span>
    </div>
  )
}

function LabelTags({ label, tags, extra }: { label: string; tags: string[]; extra?: string | null }) {
  return (
    <div>
      <span className="font-medium text-muted-foreground">{label}：</span>
      <div className="flex flex-wrap gap-1 mt-0.5">
        {tags.map((t) => (
          <Badge key={t} variant="secondary" className="text-[10px] font-normal">{t}</Badge>
        ))}
        {extra && <span className="text-muted-foreground">({extra})</span>}
      </div>
    </div>
  )
}

function LabelTagsOrEmpty({ label, tags, extra }: { label: string; tags?: string[] | null; extra?: string | null }) {
  if (!tags || tags.length === 0) {
    return <LabelValue label={label} value={extra ? `未選択（${extra}）` : '未選択'} />
  }
  return <LabelTags label={label} tags={tags} extra={extra} />
}

// ============================================
// アンケート再送行（既存）
// ============================================
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
