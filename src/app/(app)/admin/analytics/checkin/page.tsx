'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'
import { Loader2, Trash2, RefreshCw, UserCheck, Clock, CheckCircle2 } from 'lucide-react'
import { getAdminCheckedInCustomers, deleteCheckinRecord, type AdminCheckedInCustomer } from '@/actions/admin-checkin'

export default function CheckinPage() {
  const [customers, setCustomers] = useState<AdminCheckedInCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminCheckedInCustomer | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdminCheckedInCustomers()
      setCustomers(data)
    } catch {
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(deleteTarget.id)
    try {
      const result = await deleteCheckinRecord(deleteTarget.id)
      if (result.success) {
        setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      } else {
        alert(result.error || '削除に失敗しました')
      }
    } catch {
      alert('削除に失敗しました')
    } finally {
      setDeleting(null)
      setDeleteTarget(null)
    }
  }

  // カテゴリ分け
  const pendingCustomers = customers.filter((c) => c.status === 'pending')
  const inProgressCustomers = customers.filter((c) => c.status === 'in_progress')
  const completedCustomers = customers.filter((c) => c.status === 'completed')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">チェックイン中</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      {/* KPIサマリー */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">施術待ち</p>
                <p className="text-2xl font-bold text-yellow-700">{pendingCustomers.length}人</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">施術中</p>
                <p className="text-2xl font-bold text-blue-700">{inProgressCustomers.length}人</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">施術完了</p>
                <p className="text-2xl font-bold text-green-700">{completedCustomers.length}人</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            本日チェックインしたお客様はいません
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 施術待ち */}
          {pendingCustomers.length > 0 && (
            <CustomerTable
              title="施術待ち"
              customers={pendingCustomers}
              deleting={deleting}
              onDeleteClick={setDeleteTarget}
              badgeVariant="warning"
              badgeLabel="待ち"
            />
          )}

          {/* 施術中 */}
          {inProgressCustomers.length > 0 && (
            <CustomerTable
              title="施術中"
              customers={inProgressCustomers}
              deleting={deleting}
              onDeleteClick={setDeleteTarget}
              badgeVariant="default"
              badgeLabel="施術中"
            />
          )}

          {/* 施術完了 */}
          {completedCustomers.length > 0 && (
            <CustomerTable
              title="施術完了"
              customers={completedCustomers}
              deleting={deleting}
              onDeleteClick={setDeleteTarget}
              badgeVariant="secondary"
              badgeLabel="完了"
            />
          )}
        </>
      )}

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>チェックイン記録を削除</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-medium text-foreground">
                    {deleteTarget.customer_code} {deleteTarget.name}
                  </span>
                  {' '}の{deleteTarget.type === 'visit' ? '施術ログ' : 'チェックイン記録'}を削除します。
                  {deleteTarget.type === 'visit' && (
                    <>
                      <br />
                      関連するLINEメッセージ履歴も削除されます。
                    </>
                  )}
                  <br />
                  この操作は取り消せません。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!!deleting}
            >
              {deleting ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />削除中...</>
              ) : (
                '削除する'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================
// テーブルコンポーネント
// ============================================

function formatTime(isoStr: string | null): string {
  if (!isoStr) return '-'
  // JST（UTC+9）で表示するため、UTCメソッドを使って手動変換
  // （サーバー/ブラウザのタイムゾーンに依存しない）
  const d = new Date(isoStr)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

function formatDuration(checkin: string | null, checkout: string | null): string {
  if (!checkin || !checkout) return '-'
  const diff = (new Date(checkout).getTime() - new Date(checkin).getTime()) / 60000
  if (diff <= 0) return '-'
  const h = Math.floor(diff / 60)
  const m = Math.round(diff % 60)
  return h > 0 ? `${h}h${m}m` : `${m}分`
}

function CustomerTable({
  title,
  customers,
  deleting,
  onDeleteClick,
  badgeVariant,
  badgeLabel,
}: {
  title: string
  customers: AdminCheckedInCustomer[]
  deleting: string | null
  onDeleteClick: (c: AdminCheckedInCustomer) => void
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning'
  badgeLabel: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {title}
          <Badge variant={badgeVariant === 'warning' ? 'outline' : badgeVariant} className={badgeVariant === 'warning' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' : ''}>
            {customers.length}人
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>顧客</TableHead>
                <TableHead>メニュー</TableHead>
                <TableHead>担当</TableHead>
                <TableHead className="text-center">チェックイン</TableHead>
                <TableHead className="text-center">チェックアウト</TableHead>
                <TableHead className="text-center">滞在</TableHead>
                <TableHead className="text-right">料金</TableHead>
                <TableHead className="text-center w-[60px]">削除</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/admin/customers/${c.customer_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {c.customer_code} {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {c.service_menu || '-'}
                  </TableCell>
                  <TableCell>{c.staff_name || '-'}</TableCell>
                  <TableCell className="text-center">{formatTime(c.checkin_at)}</TableCell>
                  <TableCell className="text-center">{formatTime(c.checkout_at)}</TableCell>
                  <TableCell className="text-center">
                    {formatDuration(c.checkin_at, c.checkout_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.price != null ? `\u00A5${c.price.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onDeleteClick(c)}
                      disabled={deleting === c.id}
                    >
                      {deleting === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
