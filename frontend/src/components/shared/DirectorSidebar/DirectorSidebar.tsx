import { useCallback } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Bell,
  LogOut,
  UserCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useUnreadCount } from '@/components/shared/NotificationPanel/NotificationPanel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'

export interface SidebarItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

const NAV_ITEMS: SidebarItem[] = [
  { label: 'Tổng quan', href: '/director', icon: LayoutDashboard },
  { label: 'Thông báo', href: '/director/notifications', icon: Bell },
]

export interface DirectorSidebarProps {
  collapsed?: boolean
  badges?: Record<string, number>
  onNotificationsOpen?: () => void
  /** Called when the user clicks the collapse/expand toggle (desktop only). */
  onToggle?: () => void
  /** When true, removes the lg:flex guard so the sidebar renders on mobile (e.g. inside a drawer). */
  forceVisible?: boolean
}

export function DirectorSidebar({
  collapsed = false,
  badges = {},
  onToggle,
  forceVisible = false,
}: DirectorSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const unread = useUnreadCount()

  const isActive = useCallback(
    (href: string) => {
      if (href === '/director') return location.pathname === '/director'
      return location.pathname.startsWith(href)
    },
    [location.pathname],
  )

  const handleLogout = useCallback(() => {
    logout()
    navigate('/')
  }, [logout, navigate])

  return (
    <aside
      className={`${forceVisible ? 'flex' : 'hidden lg:flex'} flex-col shrink-0 h-full transition-[width] duration-200 relative ${
        collapsed ? 'w-[64px]' : 'w-[232px]'
      }`}
      style={{
        background: 'var(--theme-sidebar)',
        borderRight: '1px solid var(--theme-sidebar-border)',
      }}
    >
      {/* Brand area */}
      <div
        className="flex items-center gap-2.5 px-4"
        style={{
          height: '56px',
          borderBottom: '1px solid var(--theme-sidebar-border)',
        }}
      >
        <img src="/logo.avif" alt="" className="h-7 w-7 object-contain rounded-md shrink-0" />
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <p className="text-[13px] font-semibold text-white leading-tight truncate tracking-tight">TTransport</p>
            <p className="text-[10px] font-medium leading-tight truncate" style={{ color: 'var(--theme-sidebar-text-muted)' }}>Giám đốc</p>
          </div>
        )}
      </div>

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--theme-sidebar-text-muted)' }}>
            Quản lý
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 px-2 ${collapsed ? 'pt-3' : 'pt-1'} overflow-y-auto sidebar-scroll space-y-0.5`}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const badge = badges[item.href]

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={`group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-120 ${
                collapsed ? 'justify-center' : ''
              }`}
              style={{
                background: active ? 'var(--theme-sidebar-active)' : 'transparent',
                color: active ? 'var(--theme-sidebar-active-text)' : 'var(--theme-sidebar-text)',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--theme-sidebar-hover)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--theme-sidebar-active-text)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--theme-sidebar-text)'
                }
              }}
              title={collapsed ? item.label : undefined}
            >
              {/* Active accent — subtle 2px left bar */}
              {active && !collapsed && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-r"
                  style={{ background: 'var(--theme-brand-primary)' }}
                />
              )}
              <Icon className="h-[16px] w-[16px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate tracking-tight">{item.label}</span>
                  {badge && badge > 0 && (
                    <span
                      className="shrink-0 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                      style={{ background: 'var(--theme-status-error)', color: '#fff' }}
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
      <div style={{ borderTop: '1px solid var(--theme-sidebar-border)' }} className="p-2 shrink-0">
        {collapsed ? (
          <button
            type="button"
            onClick={handleLogout}
            className="h-8 w-8 flex items-center justify-center mx-auto rounded-md transition-colors duration-150"
            style={{ color: 'var(--theme-sidebar-text-muted)' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--theme-sidebar-hover)'
              ;(e.currentTarget as HTMLElement).style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--theme-sidebar-text-muted)'
            }}
            aria-label="Đăng xuất"
          >
            <LogOut className="w-4 h-4 shrink-0" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors duration-150 cursor-pointer outline-none"
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--theme-sidebar-hover)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  {/* Avatar circle */}
                  <div
                    className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{
                      background: 'var(--theme-brand-primary)',
                      color: '#fff',
                    }}
                  >
                    {(user?.name || user?.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 text-left">
                    <span className="text-[12px] font-medium truncate leading-tight" style={{ color: 'var(--theme-sidebar-active-text)' }}>{user?.name || user?.username}</span>
                    <span className="text-[10px] truncate leading-tight" style={{ color: 'var(--theme-sidebar-text-muted)' }}>
                      Giám đốc
                    </span>
                  </div>
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 flex items-center justify-center px-1 text-[9px] font-semibold rounded-full" style={{ background: 'var(--theme-status-error)', color: '#fff' }}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 z-[9999]" side="top" align="start" sideOffset={8}>
                <DropdownMenuItem onClick={() => navigate('/director/notifications')}>
                  <Bell className="mr-2 h-4 w-4" />
                  Thông báo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/director/profile')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  Thông tin cá nhân
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={handleLogout}
              className="h-8 w-8 flex items-center justify-center rounded-md transition-colors duration-150 shrink-0"
              style={{ color: 'var(--theme-sidebar-text-muted)' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'var(--theme-sidebar-hover)'
                ;(e.currentTarget as HTMLElement).style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--theme-sidebar-text-muted)'
              }}
              aria-label="Đăng xuất"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
