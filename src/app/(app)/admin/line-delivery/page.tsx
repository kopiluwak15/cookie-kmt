import { redirect } from 'next/navigation'

// LINE配信トップへのアクセスは「サンキュー」に既定遷移
export default function LineDeliveryIndexPage() {
  redirect('/admin/line-delivery/thank-you')
}
