'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteVisitRecord } from '@/actions/visit-log'
import { PasswordConfirmDialog } from '@/components/features/password-confirm-dialog'
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

  async function handleDelete() {
    const result = await deleteVisitRecord(visitId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${visitDate}の来店履歴を削除しました`)
      router.refresh()
    }
    setOpen(false)
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

      <PasswordConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="来店履歴を削除しますか？"
        description={`${visitDate}${customerName ? '（' + customerName + '）' : ''}の来店履歴を削除します。この操作は取り消せません。`}
        onConfirm={handleDelete}
      />
    </>
  )
}
