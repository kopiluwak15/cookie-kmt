import { getCachedStaffInfo } from '@/lib/cached-auth'
import { redirect } from 'next/navigation'
import { KarteQrDisplay } from './_components/karte-qr-display'

export default async function KarteQrPage() {
  const staff = await getCachedStaffInfo()
  if (!staff) redirect('/login')

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kmt.cookie.hair'

  const qrUrl = liffId
    ? `https://liff.line.me/${liffId}?mode=karte`
    : `${appUrl}/liff/welcome?mode=karte`

  return <KarteQrDisplay qrUrl={qrUrl} />
}
