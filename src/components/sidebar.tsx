'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  UserCog,
  Clock,
  Building2,
  Megaphone,
  Settings,
  ClipboardList,
  UserCircle,
  User,
  MessageSquareHeart,
} from 'lucide-react'

// スタッフ用ナビゲーション
const staffNav = [
  { href: '/staff/visit-log', label: '施術ログ', icon: ClipboardList },
  { href: '/staff/counseling', label: 'カウンセリング', icon: MessageSquareHeart },
  { href: '/staff/store-sales', label: '店舗売上', icon: TrendingUp },
  { href: '/staff/performance', label: 'マイ実績', icon: UserCircle },
  { href: '/staff/mypage', label: 'マイページ', icon: User },
]

// 管理者用ナビゲーション（グループ化）
const adminNav = [
  { href: '/admin/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/admin/customers', label: '顧客管理', icon: Users },
  { href: '/admin/analytics/sales', label: '売上・分析', icon: TrendingUp },
  { href: '/admin/staff', label: 'スタッフ管理', icon: UserCog },
  { href: '/admin/labor-management/announcements', label: '労務管理', icon: Clock },
  { href: '/admin/store-settings/stores', label: '店舗・メニュー', icon: Building2 },
  { href: '/admin/marketing/campaigns', label: '集客', icon: Megaphone },
  { href: '/admin/settings/chemicals', label: '設定', icon: Settings },
]

// グループのプレフィックス（アクティブ判定用）
const adminGroupPrefixes: Record<string, string> = {
  '/admin/analytics/sales': '/admin/analytics',
  '/admin/labor-management/announcements': '/admin/labor-management',
  '/admin/store-settings/stores': '/admin/store-settings',
  '/admin/marketing/campaigns': '/admin/marketing',
  '/admin/settings/chemicals': '/admin/settings',
}

interface SidebarProps {
  role: 'admin' | 'staff'
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  const navItems = role === 'admin' ? adminNav : staffNav

  const isActive = (href: string) => {
    // グループプレフィックスがある場合はそれで判定
    const prefix = adminGroupPrefixes[href]
    if (prefix) {
      return pathname.startsWith(prefix)
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-gray-900">
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="flex items-center h-16 px-4 bg-gray-800">
          <h1 className="text-base font-bold text-white leading-tight">縮毛矯正＆髪質改善<br />COOKIE熊本</h1>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
