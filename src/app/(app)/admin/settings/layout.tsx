'use client'

import { TabNavLayout } from '@/components/tab-nav-layout'

const tabs = [
  { href: '/admin/settings/chemicals', label: '薬剤プリセット' },
  { href: '/admin/settings/system', label: 'システム設定' },
  { href: '/admin/settings/employment', label: '雇用形態' },
  { href: '/admin/settings/account', label: 'アカウント' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <TabNavLayout tabs={tabs}>{children}</TabNavLayout>
}
