import { getCachedStaffInfo } from '@/lib/cached-auth'
import { redirect } from 'next/navigation'
import { KarteQrClient } from './_components/karte-qr-client'

export default async function KarteQrPage() {
  const staff = await getCachedStaffInfo()
  if (!staff) redirect('/login')

  return (
    <div className="py-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">カルテ閲覧QR</h2>
        <p className="text-sm text-muted-foreground">
          顧客を選択してQRを表示。スタッフがスマホで読み取ると、LINE認証＋GPS確認後にカルテを閲覧できます。
        </p>
      </div>
      <KarteQrClient />
    </div>
  )
}
