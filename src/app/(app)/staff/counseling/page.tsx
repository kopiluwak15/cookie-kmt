import {
  getCheckedInPendingCustomers,
  getCheckedInCustomersWithKarte,
} from '@/actions/counseling'
import { getCachedStaffInfo } from '@/lib/cached-auth'
import { redirect } from 'next/navigation'
import { CounselingTabs } from './_components/counseling-tabs'

export const dynamic = 'force-dynamic'

export default async function StaffCounselingPage() {
  const staff = await getCachedStaffInfo()
  if (!staff) redirect('/login')

  const [customers, karteCustomers] = await Promise.all([
    getCheckedInPendingCustomers(),
    getCheckedInCustomersWithKarte(),
  ])

  return (
    <div className="py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">カウンセリング</h1>
        <p className="text-xs text-muted-foreground mt-1">
          本日チェックインのカルテ確認・アンケート再送
        </p>
      </div>
      <CounselingTabs
        initialCustomers={customers}
        initialKarteCustomers={karteCustomers}
      />
    </div>
  )
}
