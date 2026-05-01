'use client'

import { useState, useEffect } from 'react'
import { getTimecard, getStaffForAnnouncement, updateAttendance, deleteAttendance, getGpsEnabled, setGpsEnabled, getRecentAttendance } from '@/actions/labor-management'
import { PinDialog } from '@/components/features/pin-dialog'
import { verifyAdminPin, isAdminPinConfigured } from '@/actions/admin-security'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, FileDown, Loader2, Pencil, Trash2, Check, X, CheckSquare, MapPin, MapPinOff } from 'lucide-react'
import { toast } from 'sonner'

interface StaffMember {
  id: string
  name: string
  line_user_id: string | null
}

interface AttendanceRecord {
  id: string
  staff_id: string
  date: string
  checkin_time: string | null
  checkout_time: string | null
  checkin_gps_verified: boolean | null
  checkout_gps_verified: boolean | null
}

export default function TimecardPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [includeLog, setIncludeLog] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [isChecklistStaff, setIsChecklistStaff] = useState(false)
  const [checklistDates, setChecklistDates] = useState<string[]>([])

  // 編集関連
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCheckin, setEditCheckin] = useState('')
  const [editCheckout, setEditCheckout] = useState('')
  // PIN認証ダイアログ（編集開始 / 保存 / 削除で使い分け）
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pinDialogTitle, setPinDialogTitle] = useState('')
  const [pinDialogDesc, setPinDialogDesc] = useState<React.ReactNode>('')
  const [pinDialogLabel, setPinDialogLabel] = useState('実行')
  const [pinDialogIsDestructive, setPinDialogIsDestructive] = useState(false)
  const [pendingAction, setPendingAction] = useState<
    ((pin: string) => Promise<{ success?: boolean; error?: string }>) | null
  >(null)

  // GPS機能 ON/OFF
  const [gpsEnabled, setGpsEnabledState] = useState<boolean | null>(null)
  const [gpsToggling, setGpsToggling] = useState(false)

  // 直近タブ（本日/昨日/一昨日）の出勤者データ
  interface RecentRow {
    id: string
    staff_id: string
    date: string
    checkin_time: string | null
    checkout_time: string | null
  }
  const [recentRows, setRecentRows] = useState<RecentRow[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [recentRange, setRecentRange] = useState<{ from: string; to: string } | null>(null)

  // タブモード（直近 / 月別 / 期間指定）
  type RangeMode = 'recent' | 'month' | 'custom'
  const [rangeMode, setRangeMode] = useState<RangeMode>('recent')
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })
  const [customTo, setCustomTo] = useState(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })

  const staff = staffList.find(s => s.id === selectedStaff)

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const result = await getStaffForAnnouncement()
        if (result.error) {
          toast.error(result.error)
          setStaffList([])
        } else {
          setStaffList(result.staff || [])
          if (result.staff && result.staff.length > 0) {
            setSelectedStaff(result.staff[0].id)
          }
        }
      } catch (error) {
        toast.error('スタッフの読み込みに失敗しました')
      } finally {
        setInitialLoading(false)
      }
    }

    const loadGpsState = async () => {
      try {
        const result = await getGpsEnabled()
        if (result.error) {
          console.error('[GPS] 取得失敗:', result.error)
          toast.error(`GPS設定の取得に失敗: ${result.error}`)
          // フォールバックでON扱い（ボタンが押せる状態にする）
          setGpsEnabledState(true)
          return
        }
        if (typeof result.gpsEnabled === 'boolean') {
          setGpsEnabledState(result.gpsEnabled)
        }
      } catch (e) {
        console.error('[GPS] 例外:', e)
        toast.error('GPS設定の読み込みでエラーが発生しました')
        setGpsEnabledState(true)
      }
    }

    const loadRecent = async () => {
      setRecentLoading(true)
      try {
        const r = await getRecentAttendance(3)
        if (r.error) {
          toast.error(r.error)
          setRecentRows([])
        } else {
          setRecentRows((r.records || []) as RecentRow[])
          if (r.fromDate && r.toDate) setRecentRange({ from: r.fromDate, to: r.toDate })
        }
      } catch {
        toast.error('直近のタイムカード取得に失敗しました')
      } finally {
        setRecentLoading(false)
      }
    }

    loadStaff()
    loadGpsState()
    loadRecent()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggleGps = async () => {
    if (gpsEnabled === null) return
    setGpsToggling(true)
    try {
      const next = !gpsEnabled
      const result = await setGpsEnabled(next)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setGpsEnabledState(next)
      toast.success(next ? 'GPS機能をONにしました' : 'GPS機能をOFFにしました')
    } finally {
      setGpsToggling(false)
    }
  }

  const loadTimecard = async () => {
    if (!selectedStaff) return
    if (rangeMode === 'recent') return // 直近タブはピボット表示のみ、詳細ロード不要
    setLoading(true)
    try {
      let result
      if (rangeMode === 'custom') {
        // 期間指定モード — 開始月/終了月を渡しつつ fromDate/toDate でオーバーライド
        const [y, m] = customFrom.split('-').map(Number)
        result = await getTimecard(selectedStaff, y, m, {
          fromDate: customFrom,
          toDate: customTo,
        })
      } else {
        const [year, month] = selectedMonth.split('-')
        result = await getTimecard(selectedStaff, parseInt(year), parseInt(month))
      }

      if (result.error) {
        toast.error(result.error)
        setRecords([])
        return
      }

      setRecords(result.records || [])
      setIsChecklistStaff(result.isChecklistStaff || false)
      setChecklistDates(result.checklistDates || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTimecard()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaff, selectedMonth, rangeMode, customFrom, customTo])

  const calculateWorkTime = (checkinTime: string | null, checkoutTime: string | null) => {
    if (!checkinTime || !checkoutTime) return '-'

    try {
      const checkin = new Date(checkinTime)
      const checkout = new Date(checkoutTime)
      const diffMs = checkout.getTime() - checkin.getTime()
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60))

      return `${hours}h ${minutes}m`
    } catch {
      return '-'
    }
  }

  const calculateTotalHours = () => {
    let totalMinutes = 0

    records.forEach(record => {
      if (record.checkin_time && record.checkout_time) {
        try {
          const checkin = new Date(record.checkin_time)
          const checkout = new Date(record.checkout_time)
          const diffMs = checkout.getTime() - checkin.getTime()
          totalMinutes += diffMs / (1000 * 60)
        } catch {
          // ignore
        }
      }
    })

    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.round(totalMinutes % 60)
    return `${hours}時間 ${minutes}分`
  }

  const getDayOfWeek = (dateStr: string) => {
    const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土']
    const date = new Date(dateStr + 'T00:00:00')
    return daysOfWeek[date.getDay()]
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-'
    try {
      const date = new Date(timeStr)
      const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
      const hours = String(jstDate.getUTCHours()).padStart(2, '0')
      const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    } catch {
      return '-'
    }
  }

  // タイムスタンプから HH:MM 形式（JST）を抽出
  const extractTimeForEdit = (timeStr: string | null) => {
    if (!timeStr) return ''
    try {
      const date = new Date(timeStr)
      const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
      const hours = String(jstDate.getUTCHours()).padStart(2, '0')
      const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    } catch {
      return ''
    }
  }

  // HH:MM と日付からISO 8601タイムスタンプ（UTC）を生成
  const buildTimestamp = (dateStr: string, timeHHMM: string) => {
    if (!timeHHMM) return null
    const [hours, minutes] = timeHHMM.split(':').map(Number)
    // JST → UTC: 9時間引く
    const jstDate = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+09:00`)
    return jstDate.toISOString()
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditCheckin('')
    setEditCheckout('')
  }

  /**
   * PIN認証付きで任意の操作を実行する共通フロー。
   * 1. PIN設定済みかチェック（未設定なら案内）
   * 2. PinDialog を開いて認証
   * 3. PIN正解 → 渡された action を実行
   */
  const runWithPin = (
    title: string,
    desc: React.ReactNode,
    label: string,
    isDestructive: boolean,
    action: () => Promise<{ success?: boolean; error?: string }>
  ) => {
    setPinDialogTitle(title)
    setPinDialogDesc(desc)
    setPinDialogLabel(label)
    setPinDialogIsDestructive(isDestructive)
    setPendingAction(() => async (pin: string) => {
      // PIN未設定なら案内
      if (!(await isAdminPinConfigured())) {
        return {
          error: '管理者PINが未設定です。「設定 → システム設定」から登録してください。',
        }
      }
      // PIN認証
      if (!(await verifyAdminPin(pin))) {
        return { error: 'PINが正しくありません' }
      }
      // 認証成功 → 本処理
      return action()
    })
    setPinDialogOpen(true)
  }

  // 編集ボタンクリック → PIN認証 → 編集モード開始
  const startEdit = (record: AttendanceRecord) => {
    runWithPin(
      'タイムカードを編集',
      <>
        <span className="font-medium">
          {new Date(record.date).getMonth() + 1}/{new Date(record.date).getDate()}
        </span>{' '}
        の出退勤時間を編集します。
        <span className="block mt-1 text-xs">
          管理者PINを入力すると編集モードに入ります。
        </span>
      </>,
      '編集を開始',
      false,
      async () => {
        setEditingId(record.id)
        setEditCheckin(extractTimeForEdit(record.checkin_time))
        setEditCheckout(extractTimeForEdit(record.checkout_time))
        return { success: true }
      }
    )
  }

  // 修正の保存（編集モードで認証済み → 追加PIN不要）
  const saveEdit = async (record: AttendanceRecord) => {
    const newCheckin = buildTimestamp(record.date, editCheckin)
    const newCheckout = buildTimestamp(record.date, editCheckout)

    const result = await updateAttendance(record.id, {
      checkin_time: newCheckin,
      checkout_time: newCheckout,
    })

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('タイムカードを修正しました')
    cancelEdit()
    await loadTimecard()
  }

  // 削除ボタン → PIN認証 → 削除実行
  const requestDelete = (record: AttendanceRecord) => {
    runWithPin(
      'タイムカードを削除',
      <>
        <span className="font-medium">
          {new Date(record.date).getMonth() + 1}/{new Date(record.date).getDate()}
        </span>{' '}
        の出退勤記録を削除します。
        <span className="block mt-1 text-xs">この操作は取り消せません。</span>
      </>,
      '削除する',
      true,
      async () => {
        const result = await deleteAttendance(record.id)
        if (result.error) {
          toast.error(result.error)
          return { error: result.error }
        }
        toast.success('タイムカード記録を削除しました')
        await loadTimecard()
        return { success: true }
      }
    )
  }

  const handlePdfExport = async () => {
    if (!staff) return

    try {
      const [year, month] = selectedMonth.split('-')
      const monthStr = `${year}年${month}月`

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error('ポップアップウィンドウを開けませんでした')
        return
      }

      const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土']
      const tableRows = records
        .map(record => {
          const date = new Date(record.date + 'T00:00:00')
          const day = date.getDate()
          const dayOfWeek = daysOfWeek[date.getDay()]
          const checkinTime = formatTime(record.checkin_time)
          const checkoutTime = formatTime(record.checkout_time)
          const workTime = calculateWorkTime(record.checkin_time, record.checkout_time)
          const checkMark = isChecklistStaff
            ? `<td>${checklistDates.includes(record.date) ? '✓' : record.checkout_time ? '−' : ''}</td>`
            : ''

          return `
            <tr>
              <td>${day}</td>
              <td>${dayOfWeek}</td>
              <td>${checkinTime}</td>
              <td>${checkoutTime}</td>
              <td>${workTime}</td>
              ${checkMark}
            </tr>
          `
        })
        .join('')

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>タイムカード - ${staff.name} - ${monthStr}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Segoe UI', sans-serif;
              margin: 20px;
              color: #1a1a1a;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .info {
              font-size: 14px;
              margin-bottom: 5px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background-color: #e5e5e5;
              border: 1px solid #999;
              padding: 8px;
              font-weight: bold;
              text-align: center;
            }
            td {
              border: 1px solid #999;
              padding: 8px;
              text-align: center;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .total {
              font-size: 14px;
              margin-top: 20px;
              text-align: right;
              font-weight: bold;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">タイムカード</div>
            <div class="info">スタッフ名: ${staff.name}</div>
            <div class="info">対象月: ${monthStr}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>日</th>
                <th>曜日</th>
                <th>出勤</th>
                <th>退勤</th>
                <th>勤務時間</th>
                ${isChecklistStaff ? '<th>CHECK</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="total">
            合計勤務時間: ${calculateTotalHours()}
          </div>
          <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">
            PDFとして保存
          </button>
        </body>
        </html>
      `

      printWindow.document.write(htmlContent)
      printWindow.document.close()

      printWindow.onload = () => {
        printWindow.print()
      }

      toast.success(`${staff.name}の${monthStr}のタイムカードを印刷ダイアログで開きました`)
    } catch (error) {
      toast.error('PDF出力に失敗しました')
      console.error(error)
    }
  }

  // ============================================
  // タブ1「直近」用: 本日 / 昨日 / 一昨日 のピボット
  // ============================================
  // 注意: `toISOString()` を使うと JST ブラウザで日付が1日ズレるため
  // ローカル日付文字列を手動で組み立てる
  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const pivotDates: string[] = (() => {
    if (!recentRange) return []
    const dates: string[] = []
    const start = new Date(recentRange.from + 'T00:00:00')
    const end = new Date(recentRange.to + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(formatLocalDate(d))
    }
    return dates.reverse() // 新しい日付が左
  })()

  // staff_id × date → record
  const recentByStaffDate = new Map<string, RecentRow>()
  for (const r of recentRows) {
    recentByStaffDate.set(`${r.staff_id}__${r.date}`, r)
  }
  // 打刻があるスタッフのみ抽出（出勤者のみ表示する要件）
  // staff 名は staffList から解決
  const staffNameById = new Map<string, string>()
  for (const r of recentRows) {
    if (!r.checkin_time && !r.checkout_time) continue
    const s = staffList.find(s => s.id === r.staff_id)
    if (s) staffNameById.set(r.staff_id, s.name)
    else staffNameById.set(r.staff_id, '(退職スタッフ)')
  }
  const staffIdsSorted = Array.from(staffNameById.keys()).sort((a, b) => {
    const ai = staffList.findIndex(s => s.id === a)
    const bi = staffList.findIndex(s => s.id === b)
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
  })

  const formatPivotCell = (rec: RecentRow | undefined) => {
    if (!rec) return null
    const ci = formatTime(rec.checkin_time)
    const co = formatTime(rec.checkout_time)
    if (ci === '-' && co === '-') return null
    return { ci, co }
  }

  // ============================================
  // 月別 / 期間指定タブで共通の詳細テーブル
  // ============================================
  const renderDetailResult = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )
    }
    if (!selectedStaff) return null
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{staff?.name}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {rangeMode === 'month' ? selectedMonth : `${customFrom} 〜 ${customTo}`}
            </p>
          </div>
          <Button onClick={handlePdfExport} variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            PDF出力（A4）
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日</TableHead>
                  <TableHead>曜</TableHead>
                  <TableHead>出勤</TableHead>
                  <TableHead>退勤</TableHead>
                  <TableHead>勤務時間</TableHead>
                  <TableHead className="w-[60px] text-center">GPS</TableHead>
                  {isChecklistStaff && <TableHead className="w-[50px] text-center">CHECK</TableHead>}
                  <TableHead className="w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isChecklistStaff ? 8 : 7} className="text-center py-8 text-gray-500">
                      データがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map(record => (
                    <TableRow key={record.id}>
                      <TableCell>{new Date(record.date + 'T00:00:00').getDate()}</TableCell>
                      <TableCell>{getDayOfWeek(record.date)}</TableCell>

                      {editingId === record.id ? (
                        <>
                          <TableCell>
                            <Input
                              type="time"
                              value={editCheckin}
                              onChange={(e) => setEditCheckin(e.target.value)}
                              className="w-24 h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={editCheckout}
                              onChange={(e) => setEditCheckout(e.target.value)}
                              className="w-24 h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">-</TableCell>
                          <TableCell />
                          {isChecklistStaff && <TableCell />}
                          <TableCell>
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveEdit(record)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 text-gray-500 hover:bg-gray-50 rounded"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{formatTime(record.checkin_time)}</TableCell>
                          <TableCell>{formatTime(record.checkout_time)}</TableCell>
                          <TableCell>
                            {calculateWorkTime(record.checkin_time, record.checkout_time)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-0.5 text-[10px] leading-tight">
                              {record.checkin_time && (
                                <span className={record.checkin_gps_verified ? 'text-green-600' : 'text-gray-400'}>
                                  出: {record.checkin_gps_verified ? '✓' : '–'}
                                </span>
                              )}
                              {record.checkout_time && (
                                <span className={record.checkout_gps_verified ? 'text-green-600' : 'text-gray-400'}>
                                  退: {record.checkout_gps_verified ? '✓' : '–'}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          {isChecklistStaff && (
                            <TableCell className="text-center">
                              {checklistDates.includes(record.date) ? (
                                <CheckSquare className="h-4 w-4 text-green-600 mx-auto" />
                              ) : record.checkout_time ? (
                                <span className="text-red-400 text-xs">未</span>
                              ) : null}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEdit(record)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => requestDelete(record)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {records.length > 0 && (
            <div className="mt-6 pt-6 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span>合計勤務時間：</span>
                <span className="font-bold">{calculateTotalHours()}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* Section 1: ヘッダー + GPS設定 */}
      {/* ============================================ */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Clock className="h-7 w-7" />
          <h2 className="text-2xl font-bold">タイムカード管理</h2>
        </div>

        {/* GPS機能 ON/OFF トグル */}
        <Button
          onClick={handleToggleGps}
          disabled={gpsEnabled === null || gpsToggling}
          variant={gpsEnabled ? 'default' : 'outline'}
          className={
            gpsEnabled
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'border-gray-400 text-gray-600'
          }
        >
          {gpsToggling ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : gpsEnabled ? (
            <MapPin className="h-4 w-4 mr-2" />
          ) : (
            <MapPinOff className="h-4 w-4 mr-2" />
          )}
          GPS機能: {gpsEnabled === null ? '...' : gpsEnabled ? 'ON' : 'OFF'}
        </Button>
      </div>

      {/* ============================================ */}
      {/* タブ構成: 直近 / 月別 / 期間指定 */}
      {/* ============================================ */}
      <Tabs
        value={rangeMode === 'custom' ? 'custom' : rangeMode === 'month' ? 'month' : 'recent'}
        onValueChange={(v) => {
          if (v === 'month') setRangeMode('month')
          else if (v === 'custom') setRangeMode('custom')
          else setRangeMode('recent')
        }}
        defaultValue="recent"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="recent">直近</TabsTrigger>
          <TabsTrigger value="month">月別</TabsTrigger>
          <TabsTrigger value="custom">期間指定</TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* タブ1: 直近 — 本日/昨日/一昨日 の出勤者一覧 */}
        {/* ============================================ */}
        <TabsContent value="recent" className="mt-4">
          <Card className="border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  直近の出勤者（本日 / 昨日 / 一昨日）
                </CardTitle>
                {recentRange && (
                  <p className="text-xs text-muted-foreground">
                    {recentRange.from} 〜 {recentRange.to}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {recentLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : pivotDates.length === 0 || staffIdsSorted.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  直近3日間に打刻のあるスタッフはいません
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 w-32">スタッフ</TableHead>
                        {pivotDates.map((d, i) => {
                          const dt = new Date(d + 'T00:00:00')
                          const dow = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()]
                          const label = i === 0 ? '本日' : i === 1 ? '昨日' : '一昨日'
                          return (
                            <TableHead
                              key={d}
                              className={`text-center text-xs ${i === 0 ? 'bg-blue-50' : ''}`}
                            >
                              <div className="font-semibold text-[11px] text-blue-700">{label}</div>
                              <div className="font-medium">{dt.getMonth() + 1}/{dt.getDate()}</div>
                              <div className="text-[10px] text-muted-foreground">({dow})</div>
                            </TableHead>
                          )
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffIdsSorted.map(sid => (
                        <TableRow key={sid}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">
                            {staffNameById.get(sid)}
                          </TableCell>
                          {pivotDates.map(d => {
                            const cell = formatPivotCell(recentByStaffDate.get(`${sid}__${d}`))
                            return (
                              <TableCell key={d} className="text-center text-[11px] leading-tight">
                                {cell ? (
                                  <div className="space-y-0.5">
                                    <div className="text-green-700 font-medium">{cell.ci}</div>
                                    <div className="text-gray-400">↓</div>
                                    <div className="text-red-600 font-medium">{cell.co}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-300">－</span>
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================ */}
        {/* タブ2: 月別 — スタッフ × 月 */}
        {/* ============================================ */}
        <TabsContent value="month" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">月別 タイムカード</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">スタッフ</label>
                  {initialLoading ? (
                    <div className="text-sm text-gray-500">読み込み中...</div>
                  ) : staffList.length === 0 ? (
                    <div className="text-sm text-gray-500">スタッフがありません</div>
                  ) : (
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {staffList.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">月</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="include-log-month"
                  checked={includeLog}
                  onChange={(e) => setIncludeLog(e.target.checked)}
                />
                <label htmlFor="include-log-month" className="text-sm">
                  お知らせログを含める
                </label>
              </div>
            </CardContent>
          </Card>
          {renderDetailResult()}
        </TabsContent>

        {/* ============================================ */}
        {/* タブ3: 期間指定 — スタッフ × 自由期間 */}
        {/* ============================================ */}
        <TabsContent value="custom" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">期間指定 タイムカード</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">スタッフ</label>
                  {initialLoading ? (
                    <div className="text-sm text-gray-500">読み込み中...</div>
                  ) : staffList.length === 0 ? (
                    <div className="text-sm text-gray-500">スタッフがありません</div>
                  ) : (
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {staffList.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">期間</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="flex-1 px-2 py-2 border rounded-lg text-sm"
                    />
                    <span className="text-xs text-muted-foreground">〜</span>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="flex-1 px-2 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {renderDetailResult()}
        </TabsContent>
      </Tabs>

      {/* PIN認証ダイアログ（編集開始 / 削除で共通使用） */}
      <PinDialog
        open={pinDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPinDialogOpen(false)
            setPendingAction(null)
          }
        }}
        title={pinDialogTitle}
        description={pinDialogDesc}
        onConfirm={async (pin) => {
          if (!pendingAction) return { error: '操作対象がありません' }
          return pendingAction(pin)
        }}
        confirmLabel={pinDialogLabel}
        confirmClassName={
          pinDialogIsDestructive
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : undefined
        }
      />
    </div>
  )
}
