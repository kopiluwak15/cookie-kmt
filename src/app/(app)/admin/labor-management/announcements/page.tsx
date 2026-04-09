'use client'

import { useState, useEffect } from 'react'
import {
  createAnnouncement,
  getStaffForAnnouncement,
  getAnnouncementTemplates,
  createAnnouncementTemplate,
  deleteAnnouncementTemplate,
  getActiveAnnouncements,
  deleteAnnouncement,
} from '@/actions/labor-management'
import { PasswordConfirmDialog } from '@/components/features/password-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Send, Loader2, AlertCircle, Plus, Trash2, FileText } from 'lucide-react'
import { DeliveryTiming, AnnouncementTemplate } from '@/types'

const IMPORTANCE_LEVELS = ['重要', '確認', '指示', 'お知らせ', 'その他'] as const
const IMPORTANCE_COLORS: Record<string, string> = {
  '重要': '🔴',
  '確認': '🟠',
  '指示': '🟡',
  'お知らせ': '🟢',
  'その他': '⚪',
}

interface StaffMember {
  id: string
  name: string
  line_user_id: string | null
}

interface ActiveAnnouncement {
  id: string
  title: string
  content: string
  importance: string
  created_at: string
  recipientCount: number
  confirmedCount: number
  unconfirmedStaff: string[]
}

export default function AnnouncementsPage() {
  const [deliveryTiming, setDeliveryTiming] = useState<DeliveryTiming>('check_in')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [importance, setImportance] = useState<typeof IMPORTANCE_LEVELS[number]>('お知らせ')
  const [isLogged, setIsLogged] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  // テンプレート関連
  const [templates, setTemplates] = useState<AnnouncementTemplate[]>([])
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null)

  // 配信済み一覧
  const [activeAnnouncements, setActiveAnnouncements] = useState<ActiveAnnouncement[]>([])
  const [loadingActive, setLoadingActive] = useState(false)
  const [deleteAnnouncementId, setDeleteAnnouncementId] = useState<string | null>(null)

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const result = await getStaffForAnnouncement()
        if (result.error) {
          toast.error(result.error)
          setStaffList([])
        } else {
          setStaffList(result.staff || [])
        }
      } catch (error) {
        toast.error('スタッフの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }
    loadStaff()
  }, [])

  // タイミング切り替え時にテンプレート＋配信済みを再読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        const [templateResult, activeResult] = await Promise.all([
          getAnnouncementTemplates(deliveryTiming),
          getActiveAnnouncements(deliveryTiming),
        ])
        if (!templateResult.error) {
          setTemplates(templateResult.templates || [])
        }
        if (!activeResult.error) {
          setActiveAnnouncements(activeResult.announcements || [])
        }
      } catch {
        // エラーは無視
      }
    }
    loadData()
  }, [deliveryTiming])

  const loadActiveAnnouncements = async () => {
    setLoadingActive(true)
    try {
      const result = await getActiveAnnouncements(deliveryTiming)
      if (!result.error) {
        setActiveAnnouncements(result.announcements || [])
      }
    } finally {
      setLoadingActive(false)
    }
  }

  const handleStaffToggle = (staffId: string) => {
    const newSet = new Set(selectedStaff)
    if (newSet.has(staffId)) {
      newSet.delete(staffId)
    } else {
      newSet.add(staffId)
    }
    setSelectedStaff(newSet)
  }

  const handleSelectAll = () => {
    if (selectedStaff.size === staffList.length) {
      setSelectedStaff(new Set())
    } else {
      setSelectedStaff(new Set(staffList.map(s => s.id)))
    }
  }

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error('タイトルを入力してください')
      return
    }
    if (!content.trim()) {
      toast.error('本文を入力してください')
      return
    }
    if (selectedStaff.size === 0) {
      toast.error('配信対象を選択してください')
      return
    }

    setSending(true)
    try {
      const result = await createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        importance,
        delivery_timing: deliveryTiming,
        is_logged: isLogged,
        staff_ids: Array.from(selectedStaff),
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      const timingLabel = deliveryTiming === 'check_in' ? '出勤時' : '退勤時'
      toast.success(`${selectedStaff.size}名に${timingLabel}のお知らせを配信しました`)
      setTitle('')
      setContent('')
      setImportance('お知らせ')
      setIsLogged(true)
      setSelectedStaff(new Set())

      // 配信済み一覧を再読み込み
      await loadActiveAnnouncements()
    } finally {
      setSending(false)
    }
  }

  const handleUseTemplate = (template: AnnouncementTemplate) => {
    setTitle(template.title)
    setContent(template.content)
  }

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      toast.error('テンプレート名と内容を入力してください')
      return
    }

    setSavingTemplate(true)
    try {
      const result = await createAnnouncementTemplate({
        title: newTemplateName.trim(),
        content: newTemplateContent.trim(),
        delivery_timing: deliveryTiming,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('テンプレートを保存しました')
      setNewTemplateName('')
      setNewTemplateContent('')
      setShowTemplateForm(false)

      const reloadResult = await getAnnouncementTemplates(deliveryTiming)
      if (!reloadResult.error) {
        setTemplates(reloadResult.templates || [])
      }
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return

    const result = await deleteAnnouncementTemplate(deleteTemplateId)
    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('テンプレートを削除しました')
    setTemplates(templates.filter(t => t.id !== deleteTemplateId))
  }

  const handleDeleteAnnouncement = async () => {
    if (!deleteAnnouncementId) return

    const result = await deleteAnnouncement(deleteAnnouncementId)
    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('お知らせを削除しました')
    setActiveAnnouncements(activeAnnouncements.filter(a => a.id !== deleteAnnouncementId))
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
    const m = jst.getUTCMonth() + 1
    const d = jst.getUTCDate()
    const h = String(jst.getUTCHours()).padStart(2, '0')
    const min = String(jst.getUTCMinutes()).padStart(2, '0')
    return `${m}/${d} ${h}:${min}`
  }

  const timingLabel = deliveryTiming === 'check_in' ? '出勤時' : '退勤時'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Send className="h-7 w-7" />
        <h2 className="text-2xl font-bold">お知らせ配信</h2>
      </div>

      {/* 配信タイミング選択（上部に常時表示） */}
      <div className="flex gap-2">
        <button
          onClick={() => setDeliveryTiming('check_in')}
          className={`flex-1 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            deliveryTiming === 'check_in'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          出勤時
        </button>
        <button
          onClick={() => setDeliveryTiming('check_out')}
          className={`flex-1 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            deliveryTiming === 'check_out'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          退勤時
        </button>
      </div>

      {/* 次回表示予定のお知らせ */}
      <Card className={activeAnnouncements.length > 0 ? 'border-amber-200' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {timingLabel}に表示予定のお知らせ
            </span>
            <Badge variant={activeAnnouncements.length > 0 ? 'default' : 'secondary'}>
              {activeAnnouncements.length}件
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAnnouncements.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              現在{timingLabel}に表示予定のお知らせはありません
            </p>
          ) : (
            <div className="space-y-2">
              {activeAnnouncements.map(a => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span>{IMPORTANCE_COLORS[a.importance]}</span>
                      <h4 className="font-medium text-sm">{a.title}</h4>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.content}</p>
                    <div className="mt-2">
                      <span className="text-xs text-amber-600 font-medium">
                        未確認: {a.unconfirmedStaff.join('、')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteAnnouncementId(a.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新規お知らせ作成 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">新規お知らせを追加</CardTitle>
          <p className="text-sm text-muted-foreground">
            {timingLabel}に表示されるお知らせを追加します。複数のお知らせを配信でき、スタッフはそれぞれ確認ボタンを押す必要があります。
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* テンプレート一覧 */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1">
                <FileText className="h-4 w-4" />
                テンプレート
              </Label>
              <div className="flex flex-wrap gap-2">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center gap-1">
                    <button
                      onClick={() => handleUseTemplate(t)}
                      className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      {t.title}
                    </button>
                    <button
                      onClick={() => setDeleteTemplateId(t.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* テンプレート新規作成フォーム */}
          {showTemplateForm ? (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="text-sm font-medium">新規テンプレート</Label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="テンプレート名"
              />
              <Textarea
                value={newTemplateContent}
                onChange={(e) => setNewTemplateContent(e.target.value)}
                placeholder="テンプレート内容"
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveTemplate} disabled={savingTemplate} size="sm">
                  {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  保存
                </Button>
                <Button onClick={() => setShowTemplateForm(false)} variant="outline" size="sm">
                  キャンセル
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowTemplateForm(true)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              テンプレートを追加
            </Button>
          )}

          {/* タイトル */}
          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="営業時間変更のお知らせ"
            />
          </div>

          {/* 本文 */}
          <div className="space-y-2">
            <Label htmlFor="content">本文</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="本日は17時に閉店です"
              rows={4}
            />
          </div>

          {/* ログ記録 */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="is-logged"
              checked={isLogged}
              onCheckedChange={(checked) => setIsLogged(checked === true)}
            />
            <Label htmlFor="is-logged" className="cursor-pointer text-sm">
              ログに記録する（チェック外すとその日のみ表示）
            </Label>
          </div>

          {/* 配信対象 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>配信対象</Label>
              {staffList.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {selectedStaff.size === staffList.length ? '全解除' : '全選択'}
                </button>
              )}
            </div>
            {loading ? (
              <div className="text-sm text-gray-500">スタッフを読み込み中...</div>
            ) : staffList.length === 0 ? (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">スタッフがありません</p>
                  <p className="text-xs text-yellow-700">スタッフ管理でアクティブなスタッフを追加してください</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                {staffList.map((staff) => (
                  <label key={staff.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={selectedStaff.has(staff.id)}
                      onChange={() => handleStaffToggle(staff.id)}
                    />
                    <span className="flex-1 text-sm">{staff.name}</span>
                    {staff.line_user_id ? (
                      <Badge variant="outline" className="text-xs py-0">
                        連携済
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs py-0 bg-yellow-100 text-yellow-800 border-yellow-300">
                        未連携
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 重要度 */}
          <div className="space-y-2">
            <Label className="text-sm">重要度</Label>
            <div className="flex flex-wrap gap-1.5">
              {IMPORTANCE_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setImportance(level)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    importance === level
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {IMPORTANCE_COLORS[level]} {level}
                </button>
              ))}
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSend}
              disabled={sending}
              className="flex-1"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  配信中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  お知らせを追加配信
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setTitle('')
                setContent('')
                setImportance('お知らせ')
                setSelectedStaff(new Set())
              }}
              variant="outline"
            >
              クリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* テンプレート削除ダイアログ */}
      <PasswordConfirmDialog
        open={!!deleteTemplateId}
        onOpenChange={(open) => { if (!open) setDeleteTemplateId(null) }}
        title="テンプレートを削除"
        description="このテンプレートを削除します。"
        onConfirm={handleDeleteTemplate}
        confirmLabel="削除する"
        variant="destructive"
      />

      {/* お知らせ削除ダイアログ */}
      <PasswordConfirmDialog
        open={!!deleteAnnouncementId}
        onOpenChange={(open) => { if (!open) setDeleteAnnouncementId(null) }}
        title="お知らせを削除"
        description="このお知らせを削除します。スタッフの画面にも表示されなくなります。"
        onConfirm={handleDeleteAnnouncement}
        confirmLabel="削除する"
        variant="destructive"
      />
    </div>
  )
}
