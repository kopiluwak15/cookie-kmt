import { getCachedStaffInfo } from '@/lib/cached-auth'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Supabase未設定時はデモ表示（ローカル開発用）
  const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  let staffName = 'デモユーザー'
  let role: 'admin' | 'staff' = 'admin'

  if (isSupabaseConfigured) {
    const staff = await getCachedStaffInfo()
    if (!staff) {
      redirect('/login')
    }
    staffName = staff.name
    role = staff.role
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={role} />
      <div className="md:pl-60">
        <Header staffName={staffName} role={role} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
