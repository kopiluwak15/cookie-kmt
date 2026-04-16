'use client'

import { TabNavLayout } from '@/components/tab-nav-layout'

const tabs = [
  { href: '/admin/analytics/sales', label: '売上実績' },
  { href: '/admin/analytics/checkin', label: 'チェックイン中' },
  { href: '/admin/analytics/repeat', label: 'リピート分析' },
  { href: '/admin/analytics/cases', label: '症例分析' },
  { href: '/admin/analytics/history', label: '来店履歴' },
]

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <TabNavLayout tabs={tabs}>{children}</TabNavLayout>
}
