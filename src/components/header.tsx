'use client'

import { useState } from 'react'
import { logout } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  ClipboardList,
  LayoutDashboard,
  Users,
  TrendingUp,
  UserCircle,
  UserCog,
  Building2,
  User,
  Clock,
  Megaphone,
  Settings,
  MessageSquareHeart,
} from 'lucide-react'

// グループのプレフィックス（アクティブ判定用）
const groupPrefixes: Record<string, string> = {
  '/admin/analytics/sales': '/admin/analytics',
  '/admin/labor-management/announcements': '/admin/labor-management',
  '/admin/store-settings/stores': '/admin/store-settings',
  '/admin/marketing/campaigns': '/admin/marketing',
  '/admin/settings/line': '/admin/settings',
}

const allNav = [
  // スタッフ用
  { href: '/staff/visit-log', label: '施術ログ', icon: ClipboardList, roles: ['staff'] },
  { href: '/staff/counseling', label: 'カウンセリング', icon: MessageSquareHeart, roles: ['staff'] },
  { href: '/staff/store-sales', label: '店舗売上', icon: TrendingUp, roles: ['staff'] },
  { href: '/staff/performance', label: 'マイ実績', icon: UserCircle, roles: ['staff'] },
  { href: '/staff/mypage', label: 'マイページ', icon: User, roles: ['staff'] },
  // 管理者用（グループ化済み）
  { href: '/admin/dashboard', label: 'ダッシュボード', icon: LayoutDashboard, roles: ['admin'] },
  { href: '/admin/customers', label: '顧客管理', icon: Users, roles: ['admin'] },
  { href: '/admin/analytics/sales', label: '売上・分析', icon: TrendingUp, roles: ['admin'] },
  { href: '/admin/staff', label: 'スタッフ管理', icon: UserCog, roles: ['admin'] },
  { href: '/admin/labor-management/announcements', label: '労務管理', icon: Clock, roles: ['admin'] },
  { href: '/admin/store-settings/stores', label: '店舗・メニュー', icon: Building2, roles: ['admin'] },
  { href: '/admin/marketing/campaigns', label: '集客', icon: Megaphone, roles: ['admin'] },
  { href: '/admin/settings/line', label: '設定', icon: Settings, roles: ['admin'] },
]

interface HeaderProps {
  staffName: string
  role: 'admin' | 'staff'
}

export function Header({ staffName, role }: HeaderProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const navItems = allNav.filter((item) => item.roles.includes(role))

  const isActive = (href: string) => {
    const prefix = groupPrefixes[href]
    if (prefix) {
      return pathname.startsWith(prefix)
    }
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-white border-b md:pl-64">
      {/* モバイルメニュー */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0 bg-gray-900">
          <div className="flex items-center h-16 px-4 bg-gray-800">
            <h1 className="text-lg font-bold text-white">縮毛矯正＆髪質改善COOKIE熊本</h1>
          </div>
          <nav className="px-2 py-4 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
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
        </SheetContent>
      </Sheet>

      <div className="md:hidden text-lg font-bold">縮毛矯正＆髪質改善COOKIE熊本</div>

      {/* ユーザー情報・ログアウト */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{staffName}</span>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">
            <LogOut className="h-4 w-4 mr-1" />
            ログアウト
          </Button>
        </form>
      </div>
    </header>
  )
}
