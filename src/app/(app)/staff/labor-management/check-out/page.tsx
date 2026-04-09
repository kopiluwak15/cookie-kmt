'use client'

import { useState, useEffect } from 'react'
import {
  checkOut,
  getUnreadAnnouncements,
  confirmAnnouncement,
  getChecklistItems,
} from '@/actions/labor-management'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Announcement } from '@/types'

const IMPORTANCE_COLORS: Record<string, string> = {
  '重要': '🔴',
  '確認': '🟠',
  '指示': '🟡',
  'お知らせ': '🟢',
  'その他': '⚪',
}

interface ChecklistItem {
  id: string
  label: string
  description: string | null
  sort_order: number
}

export default function CheckOutPage() {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [checking, setChecking] = useState(false)
  const [loadingChecklist, setLoadingChecklist] = useState(true)

  // 退勤時お知らせ
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)

  // チェックリスト項目をDBから読み込み
  useEffect(() => {
    const load = async () => {
      try {
        const result = await getChecklistItems(true)
        if (!result.error) {
          setChecklistItems(result.items || [])
        }
      } catch {
        // フォールバック無し
      } finally {
        setLoadingChecklist(false)
      }
    }
    load()
  }, [])

  // 退勤時お知らせ読み込み
  useEffect(() => {
    const load = async () => {
      try {
        const result = await getUnreadAnnouncements('check_out')
        if (!result.error) {
          setAnnouncements(result.announcements || [])
        }
      } catch {
        setAnnouncements([])
      } finally {
        setLoadingAnnouncements(false)
      }
    }
    load()
  }, [])

  const handleConfirm = async (announcementId: string) => {
    try {
      const result = await confirmAnnouncement(announcementId)
      if (result.error) {
        toast.error(result.error)
      } else {
        setConfirmedIds(prev => new Set([...prev, announcementId]))
      }
    } catch {
      toast.error('確認に失敗しました')
    }
  }

  const toggleChecklistItem = (itemId: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const handleCheckOut = async () => {
    setChecking(true)
    try {
      // sessionStorage から GPS検証状態を取得
      const gpsRaw = typeof window !== 'undefined' ? sessionStorage.getItem('gps_verified') : null
      const gpsVerified: boolean | null = gpsRaw === 'true' ? true : null

      const result = await checkOut(Array.from(checkedIds), gpsVerified)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('退勤しました')
      }
    } finally {
      setChecking(false)
    }
  }

  const allChecked = checklistItems.length === 0 || checkedIds.size === checklistItems.length
  const allAnnouncementsConfirmed = announcements.length === 0 || confirmedIds.size === announcements.length
  const canCheckOut = allChecked && allAnnouncementsConfirmed

  const isLoading = loadingChecklist || loadingAnnouncements

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white p-4 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-center gap-2 pt-6">
        <Clock className="h-8 w-8 text-red-600" />
        <h1 className="text-3xl font-bold text-red-600">退勤</h1>
      </div>

      {/* 退勤時のお知らせ */}
      {announcements.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              退勤時のお知らせ ({confirmedIds.size}/{announcements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.map(announcement => {
              const isConfirmed = confirmedIds.has(announcement.id)
              return (
                <div
                  key={announcement.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isConfirmed
                      ? 'bg-green-50 border-green-300'
                      : 'bg-white border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{IMPORTANCE_COLORS[announcement.importance]}</span>
                        <h3 className="font-bold text-lg break-words">{announcement.title}</h3>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap break-words">
                        {announcement.content}
                      </p>
                    </div>
                    {isConfirmed && (
                      <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                    )}
                  </div>

                  {!isConfirmed && (
                    <Button
                      onClick={() => handleConfirm(announcement.id)}
                      className="w-full mt-3"
                      variant="default"
                    >
                      確認しました
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* チェックリスト */}
      {checklistItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                閉店チェックリスト
              </span>
              <span className="text-sm font-normal text-gray-600">
                {checkedIds.size}/{checklistItems.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklistItems.map(item => (
              <label
                key={item.id}
                className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  checkedIds.has(item.id)
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={checkedIds.has(item.id)}
                    onCheckedChange={() => toggleChecklistItem(item.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg">{item.label}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    )}
                  </div>
                  {checkedIds.has(item.id) && (
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                  )}
                </div>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 退勤ボタン */}
      <div className="space-y-3">
        {!canCheckOut && (
          <p className="text-center text-sm text-red-700 bg-red-100 p-3 rounded-lg">
            {!allAnnouncementsConfirmed
              ? 'すべてのお知らせを確認してください'
              : 'すべてのチェックリストを完了してください'}
          </p>
        )}
        <Button
          onClick={handleCheckOut}
          disabled={!canCheckOut || checking}
          className={`w-full py-8 text-xl font-bold transition-all ${
            canCheckOut
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          size="lg"
        >
          {checking ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              退勤中...
            </>
          ) : (
            '退勤'
          )}
        </Button>
      </div>
    </div>
  )
}
