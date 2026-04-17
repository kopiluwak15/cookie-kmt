'use client'

import { TabNavLayout } from '@/components/tab-nav-layout'

const tabs = [
  { href: '/admin/marketing/coupons', label: 'クーポン' },
  { href: '/admin/marketing/campaigns', label: 'キャンペーン' },
  { href: '/admin/marketing/line', label: 'LINE配信設定' },
]

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <TabNavLayout tabs={tabs}>{children}</TabNavLayout>
}
