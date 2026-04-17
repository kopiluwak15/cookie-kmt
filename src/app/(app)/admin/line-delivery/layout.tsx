'use client'

import { TabNavLayout } from '@/components/tab-nav-layout'

const tabs = [
  { href: '/admin/line-delivery/thank-you', label: 'サンキュー' },
  { href: '/admin/line-delivery/thank-you-concept', label: 'コンセプト用サンキュー' },
  { href: '/admin/line-delivery/thank-you-repeat', label: '再サンキュー' },
  { href: '/admin/line-delivery/reminder-1', label: 'リマインド①' },
  { href: '/admin/line-delivery/reminder-2', label: 'リマインド②' },
  { href: '/admin/line-delivery/maintenance-1', label: 'メンテナンス①' },
  { href: '/admin/line-delivery/maintenance-2', label: 'メンテナンス②' },
  { href: '/admin/line-delivery/dormant', label: '休眠' },
]

export default function LineDeliveryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <TabNavLayout tabs={tabs}>{children}</TabNavLayout>
}
