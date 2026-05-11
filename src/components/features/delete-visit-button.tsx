'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteVisitRecord } from '@/actions/visit-log'
import { PinDialog } from '@/components/features/pin-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function DeleteVisitButton({
  visitId,
  visitDate,
  customerName,
}: {
  visitId: string
  visitDate: string
  customerName?: string
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function handleDeleteWithPin(pin: string) {
    const result = await deleteVisitRecord(visitId, pin)
    if (result.success) {
      toast.success(`${visitDate}の来店履歴を削除しました`)
      router.refresh()
      return { success: true }
    }
    return { error: result.error || '削除に失敗しました' }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        title={`${visitDate}${customerName ? ' ' + customerName : ''}の履歴を削除`}
        className="h-7 w-7 p-0"
      >
        <Trash2 className="h-3.5 w-3.5 text-red-400 hover:text-red-600" />
      </Button>

      <PinDialog
        open={open}
        onOpenChange={setOpen}
        title="来店履歴を削除しますか？"
        description={
          <>
            <span className="font-medium text-foreground">
              {visitDate}
              {customerName ? `（${customerName}）` : ''}
            </span>{' '}
            の来店履歴を削除します。
            <br />
            <span className="block mt-1 text-xs">
              ※ 関連する症例レコード（case_records）も同時削除されます。LINE送信ログは保持され、リンクのみ解除されます。
            </span>
            <br />
            この操作は取り消せません。
          </>
        }
        onConfirm={handleDeleteWithPin}
        confirmLabel="削除する"
      />
    </>
  )
}
