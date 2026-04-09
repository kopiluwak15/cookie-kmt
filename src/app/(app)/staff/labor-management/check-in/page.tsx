'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUnreadAnnouncements, confirmAnnouncement, checkIn } from '@/actions/labor-management'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export default function CheckInPage() {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const result = await getUnreadAnnouncements('check_in')
        if (result.error) {
          toast.error(result.error)
          setAnnouncements([])
        } else {
          setAnnouncements(result.announcements || [])
        }
      } catch {
        toast.error('お知らせの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    loadAnnouncements()
  }, [])

  // 出勤完了後のカウントダウン＆自動遷移
  useEffect(() => {
    if (!checkedIn) return

    if (countdown <= 0) {
      router.replace('/staff/visit-log')
      return
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [checkedIn, countdown, router])

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

  const handleCheckIn = async () => {
    setChecking(true)
    try {
      // sessionStorage から GPS検証状態を取得
      const gpsRaw = typeof window !== 'undefined' ? sessionStorage.getItem('gps_verified') : null
      const gpsVerified: boolean | null = gpsRaw === 'true' ? true : null

      const result = await checkIn(gpsVerified)
      if (result.error) {
        toast.error(result.error)
      } else {
        setCheckedIn(true)
      }
    } finally {
      setChecking(false)
    }
  }

  const canCheckIn = announcements.length === 0 || confirmedIds.size === announcements.length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>読み込み中...</p>
        </div>
      </div>
    )
  }

  // 出勤完了画面
  if (checkedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-green-300">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold text-green-700">出勤しました</h2>
            <p className="text-sm text-gray-500">
              {countdown}秒後に施術ログページへ移動します...
            </p>
            <Button
              onClick={() => router.replace('/staff/visit-log')}
              variant="outline"
              className="w-full"
            >
              今すぐ移動
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-center gap-2 pt-6">
        <Clock className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-blue-600">出勤</h1>
      </div>

      {/* お知らせセクション */}
      {announcements.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              出勤時のお知らせ ({confirmedIds.size}/{announcements.length})
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

      {/* 出勤ボタン */}
      <div className="space-y-3">
        {announcements.length > 0 && !canCheckIn && (
          <p className="text-center text-sm text-amber-700 bg-amber-100 p-3 rounded-lg">
            すべてのお知らせを確認してください
          </p>
        )}
        <Button
          onClick={handleCheckIn}
          disabled={!canCheckIn || checking}
          className={`w-full py-8 text-xl font-bold transition-all ${
            canCheckIn
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          size="lg"
        >
          {checking ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              出勤中...
            </>
          ) : (
            '出勤'
          )}
        </Button>
      </div>

      {/* お知らせがない場合 */}
      {announcements.length === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <p className="text-lg font-semibold text-green-700">
              お知らせはありません
            </p>
            <p className="text-sm text-green-600 mt-1">
              出勤ボタンを押してください
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
