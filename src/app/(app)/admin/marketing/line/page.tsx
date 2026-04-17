import { redirect } from 'next/navigation'

/**
 * LINE配信設定は独立サイドバー項目「LINE配信」に昇格しました。
 * 旧URLはデフォルトタブへリダイレクトします。
 */
export default function LegacyMarketingLinePage() {
  redirect('/admin/line-delivery/thank-you')
}
