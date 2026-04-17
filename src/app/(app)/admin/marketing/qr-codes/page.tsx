import { redirect } from 'next/navigation'

/**
 * QRコードページは 店舗・メニュー 配下へ移動しました。
 * 旧URLにアクセスされた場合は新URLへリダイレクトします。
 */
export default function LegacyQrCodesPage() {
  redirect('/admin/store-settings/qr-codes')
}
