import { getCheckedInPendingCustomers } from '@/actions/counseling'
import { getCachedStaffInfo } from '@/lib/cached-auth'
import { redirect } from 'next/navigation'
import { CounselingTabs } from './_components/counseling-tabs'

export const dynamic = 'force-dynamic'

export default async function StaffCounselingPage() {
  const staff = await getCachedStaffInfo()
  if (!staff) redirect('/login')

  const customers = await getCheckedInPendingCustomers()

  return (
    <div className="py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">カウンセリング</h1>
        <p className="text-xs text-muted-foreground mt-1">
          施術中にメニューが変わった際のアンケート再送・QR提示
        </p>
      </div>
      <CounselingTabs initialCustomers={customers} />
    </div>
  )
}
