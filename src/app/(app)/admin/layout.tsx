import { getCachedStaffInfo } from '@/lib/cached-auth'
import { redirect } from 'next/navigation'

const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (isSupabaseConfigured) {
    // React.cache() により親 layout と同一リクエスト内で2回呼ばれてもDB問い合わせは1回
    const staff = await getCachedStaffInfo()
    if (!staff) redirect('/login')
    if (staff.role !== 'admin') redirect('/staff/visit-log')
  }

  return <>{children}</>
}
