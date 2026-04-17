'use client'

import { TabNavLayout } from '@/components/tab-nav-layout'

const tabs = [
  { href: '/admin/store-settings/stores', label: '店舗管理' },
  { href: '/admin/store-settings/menus', label: 'メニュー設定' },
  { href: '/admin/store-settings/styles', label: 'スタイル設定' },
  { href: '/admin/store-settings/qr-codes', label: 'QRコード' },
]

export default function StoreSettingsLayout({ children }: { children: React.ReactNode }) {
  return <TabNavLayout tabs={tabs}>{children}</TabNavLayout>
}
