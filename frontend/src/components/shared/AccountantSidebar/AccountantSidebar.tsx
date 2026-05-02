import { useCallback, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Truck,
  Briefcase,
  Users,
  MapPin,
  Tag,
  Wallet,
  LogOut,
  Bell,
  UserCircle,
  ChevronUp,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useUnreadCount } from '@/components/shared/NotificationPanel/NotificationPanel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'

export interface SidebarItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

const NAV_ITEMS: SidebarItem[] = [
  { label: 'Tổng quan', href: '/accountant', icon: LayoutDashboard },
  { label: 'Đơn hàng', href: '/accountant/trips', icon: FileText },
  { label: 'Chuyến đã đi', href: '/accountant/driver-trips', icon: Truck },
  { label: 'Đối soát', href: '/accountant/work-orders', icon: Briefcase },
  { label: 'Đối tác', href: '/accountant/partners', icon: Users },
  { label: 'Cung đường', href: '/accountant/routes', icon: MapPin },
  { label: 'Bảng giá', href: '/accountant/pricing', icon: Tag },
  { label: 'Kỳ lương', href: '/accountant/salary-setup', icon: Wallet },
]

export interface AccountantSidebarProps {
  collapsed?: boolean
  badges?: Record<string, number>
  onNotificationsOpen?: () => void
}

export function AccountantSidebar({
  collapsed = false,
  badges = {},
  onNotificationsOpen,
}: AccountantSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const unread = useUnreadCount()

  const isActive = useCallback(
    (href: string) => {
      if (href === '/accountant') {
        return location.pathname === '/accountant'
      }
      return location.pathname.startsWith(href)
    },
    [location.pathname]
  )

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 transition-all duration-200 ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
      style={{
        background: 'var(--theme-sidebar, #0a3520)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Logo area */}
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <img src="/logo.avif" alt="" className="h-7 w-7 object-contain rounded-md shrink-0" />
        {!collapsed && (
          <p className="text-[13px] font-bold text-white/95 leading-tight truncate">Vận Tải Phúc Lộc</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto sidebar-scroll">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const badge = badges[item.href]

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                collapsed ? 'justify-center' : ''
              }`}
              style={{
                background: active
                  ? 'color-mix(in srgb, var(--theme-brand-primary) 20%, transparent)'
                  : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.65)',
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className="h-[18px] w-[18px] shrink-0"
                style={{
                  color: active ? '#ffffff' : 'rgba(255,255,255,0.45)',
                  filter: active ? 'drop-shadow(0 0 5px rgba(255,255,255,0.95)) brightness(1.3)' : 'none',
                }}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge && badge > 0 && (
                    <span
                      className="shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                      style={{ background: 'var(--theme-status-warning)', color: '#fff' }}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer — user menu */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} className="p-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`relative flex items-center w-full rounded-xl transition-all duration-200 cursor-pointer outline-none border border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.1] ${
                collapsed ? 'h-9 w-9 justify-center mx-auto' : 'min-h-[40px] px-2.5 py-2 gap-2.5'
              }`}
            >
              {collapsed && user && (
                <span className="text-[11px] font-bold text-white/80">
                  {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                </span>
              )}
              {!collapsed && user && (
                <>
                  <div className="flex flex-col min-w-0 flex-1 text-left">
                    <span className="text-[10px] text-white/45 truncate leading-tight uppercase font-semibold tracking-wide">Xin chào</span>
                    <span className="text-[13px] font-medium truncate leading-tight text-white/90">{user.name || user.username}</span>
                  </div>
                  <ChevronUp className="w-3.5 h-3.5 shrink-0 text-white/45" />
                </>
              )}
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 flex items-center justify-center px-1 text-[10px] font-semibold rounded-full bg-red-500 text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 z-[9999]"
            side="top"
            align={collapsed ? 'center' : 'end'}
            sideOffset={8}
          >
            {user && (
              <>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold">{user.name || user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.role === 'accountant' ? 'Kế toán' : user.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => navigate('/accountant/notifications')}>
              <Bell className="mr-2 h-4 w-4" />
              Thông báo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/accountant/profile')}>
              <UserCircle className="mr-2 h-4 w-4" />
              Thông tin cá nhân
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
