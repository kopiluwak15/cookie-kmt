'use client'

import { TabNavLayout } from '@/components/tab-nav-layout'

const tabs = [
  { href: '/admin/labor-management/announcements', label: 'お知らせ配信' },
  { href: '/admin/labor-management/timecard', label: 'タイムカード' },
  { href: '/admin/labor-management/logs', label: 'お知らせログ' },
  { href: '/admin/labor-management/checklist', label: 'チェックリスト' },
]

export default function LaborManagementLayout({ children }: { children: React.ReactNode }) {
  return <TabNavLayout tabs={tabs}>{children}</TabNavLayout>
}
