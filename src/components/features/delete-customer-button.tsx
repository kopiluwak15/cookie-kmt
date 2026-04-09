'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCustomer } from '@/actions/customers'
import { Button } from '@/components/ui/button'
import { PasswordConfirmDialog } from '@/components/features/password-confirm-dialog'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteCustomerButtonProps {
  customerId: string
  customerName: string
}

export function DeleteCustomerButton({ customerId, customerName }: DeleteCustomerButtonProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    const result = await deleteCustomer(customerId)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('顧客を削除しました')
    setOpen(false)
    router.push('/admin/customers')
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-500 hover:text-red-700 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        削除
      </Button>

      <PasswordConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="顧客を削除しますか？"
        description={`「${customerName}」を削除します。施術履歴・LINE送信履歴も全て削除されます。この操作は取り消せません。`}
        onConfirm={handleDelete}
      />
    </>
  )
}
