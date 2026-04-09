'use client'

import { useState, useEffect } from 'react'
import { getAnnouncementLogs, deleteAnnouncement } from '@/actions/labor-management'
import { PasswordConfirmDialog } from '@/components/features/password-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { History, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface AnnouncementLog {
  id: string
  title: string
  content: string
  importance: string
  created_by: string
  created_at: string
  announcement_recipients?: any[]
  announcement_reads?: any[]
}

const IMPORTANCE_COLORS: Record<string, { bg: string; text: string; emoji: string }> = {
  '重要': { bg: 'bg-red-100', text: 'text-red-800', emoji: '🔴' },
  '確認': { bg: 'bg-orange-100', text: 'text-orange-800', emoji: '🟠' },
  '指示': { bg: 'bg-yellow-100', text: 'text-yellow-800', emoji: '🟡' },
  'お知らせ': { bg: 'bg-green-100', text: 'text-green-800', emoji: '🟢' },
  'その他': { bg: 'bg-gray-100', text: 'text-gray-800', emoji: '⚪' },
}

export default function AnnouncementLogsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const result = await getAnnouncementLogs()
        if (result.error) {
          toast.error(result.error)
          setAnnouncements([])
        } else {
          setAnnouncements(result.announcements || [])
        }
      } catch (error) {
        toast.error('ログの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    loadLogs()
  }, [])

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return

    const result = await deleteAnnouncement(deleteTargetId)
    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('お知らせを削除しました')
    setAnnouncements(announcements.filter(a => a.id !== deleteTargetId))
  }

  const deleteTarget = announcements.find(a => a.id === deleteTargetId)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <History className="h-7 w-7" />
          <h2 className="text-2xl font-bold">お知らせ配信ログ</h2>
        </div>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-7 w-7" />
        <h2 className="text-2xl font-bold">お知らせ配信ログ</h2>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>配信ログがありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map(announcement => {
            const isExpanded = expandedId === announcement.id
            const importance = IMPORTANCE_COLORS[announcement.importance] || IMPORTANCE_COLORS['その他']
            const recipients = announcement.announcement_recipients || []
            const reads = announcement.announcement_reads || []

            const readStaffIds = new Set(reads.map((r: any) => r.staff_id))
            const confirmedStaff = recipients.filter((r: any) => readStaffIds.has(r.staff_id))
            const notConfirmedStaff = recipients.filter((r: any) => !readStaffIds.has(r.staff_id))

            return (
              <Card key={announcement.id}>
                <CardHeader className={importance.bg}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{importance.emoji}</span>
                        <h3 className={`text-lg font-bold ${importance.text}`}>
                          {announcement.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(announcement.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className={importance.text}>
                      {announcement.importance}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <p className="text-gray-700 whitespace-pre-wrap mb-4">
                    {announcement.content}
                  </p>

                  <div className="flex gap-2 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : announcement.id)}
                      className="flex-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          確認状況を閉じる
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          確認状況を表示（{confirmedStaff.length}/{recipients.length}）
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTargetId(announcement.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 mt-4 pt-4 border-t">
                      {confirmedStaff.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-green-700 flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4" />
                            確認済み（{confirmedStaff.length}名）
                          </h4>
                          <div className="space-y-2 ml-6">
                            {confirmedStaff.map((staff: any) => {
                              const read = reads.find((r: any) => r.staff_id === staff.staff_id)
                              return (
                                <div
                                  key={staff.staff_id}
                                  className="flex items-center justify-between p-2 rounded bg-green-50"
                                >
                                  <span className="text-sm font-medium">
                                    {staff.staff_name || staff.staff_id}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    {read && formatDate(read.confirmed_at)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {notConfirmedStaff.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-orange-700 flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4" />
                            未確認（{notConfirmedStaff.length}名）
                          </h4>
                          <div className="space-y-2 ml-6">
                            {notConfirmedStaff.map((staff: any) => (
                              <div
                                key={staff.staff_id}
                                className="flex items-center p-2 rounded bg-orange-50"
                              >
                                <span className="text-sm font-medium">
                                  {staff.staff_name || staff.staff_id}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* パスワード確認ダイアログ */}
      <PasswordConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null)
        }}
        title="お知らせを削除"
        description={`「${deleteTarget?.title || ''}」を削除します。この操作は取り消せません。`}
        onConfirm={handleDeleteConfirm}
        confirmLabel="削除する"
        variant="destructive"
      />
    </div>
  )
}
