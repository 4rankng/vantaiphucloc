import { useCallback } from 'react'
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
  ChevronLeft,
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

const ACCOUNTANT_NAV_ITEMS: SidebarItem[] = [
  { label: 'Tổng quan', href: '/accountant', icon: LayoutDashboard },
  { label: 'Đơn hàng', href: '/accountant/trips', icon: FileText },
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
  /** Called when the user clicks the collapse/expand toggle (desktop only). */
  onToggle?: () => void
  /** When true, removes the lg:flex guard so the sidebar renders on mobile (e.g. inside a drawer). */
  forceVisible?: boolean
  /** Override the navigation items (defaults to accountant nav). */
  items?: SidebarItem[]
  /** Path used for the "active root" check — defaults to '/accountant'. */
  rootPath?: string
  /** Path for the Notifications dropdown item; if omitted, item is hidden. */
  notificationsPath?: string
  /** Path for the Profile dropdown item; if omitted, item is hidden. */
  profilePath?: string
}

export function AccountantSidebar({
  collapsed = false,
  badges = {},
  onToggle,
  forceVisible = false,
  items,
  rootPath = '/accountant',
  notificationsPath = '/accountant/notifications',
  profilePath = '/accountant/profile',
}: AccountantSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const unread = useUnreadCount()

  const navItems = items ?? ACCOUNTANT_NAV_ITEMS

  const isActive = useCallback(
    (href: string) => {
      if (href === rootPath) return location.pathname === rootPath
      return location.pathname.startsWith(href)
    },
    [location.pathname, rootPath],
  )

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
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
            <p className="text-[13px] font-semibold text-white leading-tight truncate tracking-tight">Phúc Lộc</p>
            <p className="text-[10px] font-medium leading-tight truncate" style={{ color: 'var(--theme-sidebar-text-muted)' }}>Vận tải</p>
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
        {navItems.map((item) => {
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

      {/* ── Sidebar art — road transport motif ── */}
      {!collapsed && (
        <div className="sidebar-art shrink-0 px-3 pb-2">
          <svg
            viewBox="0 0 200 68"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ width: '100%', display: 'block' }}
          >
            {/* Stars */}
            <circle cx="18"  cy="10" r="1"   fill="white" fillOpacity="0.5"/>
            <circle cx="60"  cy="6"  r="0.8" fill="white" fillOpacity="0.4"/>
            <circle cx="120" cy="9"  r="1.1" fill="white" fillOpacity="0.55"/>
            <circle cx="170" cy="5"  r="0.9" fill="white" fillOpacity="0.4"/>
            <circle cx="190" cy="14" r="0.8" fill="white" fillOpacity="0.35"/>
            <circle cx="88"  cy="18" r="0.7" fill="white" fillOpacity="0.3"/>
            {/* Horizon hill */}
            <path d="M0 32 Q50 22 100 28 Q150 34 200 24 L200 36 L0 36 Z"
                  fill="white" fillOpacity="0.05"/>
            {/* Road surface */}
            <rect x="0" y="36" width="200" height="32" fill="white" fillOpacity="0.05" rx="2"/>
            {/* Road center dashes */}
            <g stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.25">
              <line x1="0"   y1="52" x2="22"  y2="52"/>
              <line x1="34"  y1="52" x2="56"  y2="52"/>
              <line x1="68"  y1="52" x2="90"  y2="52"/>
              <line x1="102" y1="52" x2="124" y2="52"/>
              <line x1="136" y1="52" x2="158" y2="52"/>
              <line x1="170" y1="52" x2="192" y2="52"/>
            </g>
            {/* Road edges */}
            <line x1="0" y1="36" x2="200" y2="36" stroke="white" strokeWidth="1" strokeOpacity="0.12"/>
            {/* Truck body */}
            <g transform="translate(18 37)">
              <rect x="0" y="2" width="62" height="26" rx="2.5" fill="white" fillOpacity="0.12"/>
              <rect x="0" y="2" width="62" height="4"  rx="2" fill="white" fillOpacity="0.08"/>
              <path d="M62 6 L80 6 Q84 6 84 10 L84 28 L62 28 Z" fill="white" fillOpacity="0.16"/>
              <rect x="64" y="9" width="18" height="11" rx="1.5" fill="white" fillOpacity="0.1"/>
              <rect x="82" y="10" width="3" height="4" rx="1" fill="white" fillOpacity="0.35"/>
              <circle cx="15"  cy="31" r="5.5" fill="white" fillOpacity="0.18"/>
              <circle cx="15"  cy="31" r="2.2" fill="white" fillOpacity="0.1"/>
              <circle cx="68"  cy="31" r="5.5" fill="white" fillOpacity="0.18"/>
              <circle cx="68"  cy="31" r="2.2" fill="white" fillOpacity="0.1"/>
            </g>
            {/* Distant truck (right) */}
            <g transform="translate(130 41)" opacity="0.55">
              <rect x="0" y="1" width="36" height="16" rx="2" fill="white" fillOpacity="0.1"/>
              <path d="M36 3 L48 3 Q51 3 51 6 L51 17 L36 17 Z" fill="white" fillOpacity="0.13"/>
              <circle cx="8"  cy="19" r="3.5" fill="white" fillOpacity="0.14"/>
              <circle cx="42" cy="19" r="3.5" fill="white" fillOpacity="0.14"/>
            </g>
            {/* Motion streaks */}
            <g stroke="white" strokeLinecap="round" strokeOpacity="0.1">
              <line x1="0"  y1="44" x2="14" y2="44" strokeWidth="2"/>
              <line x1="0"  y1="49" x2="10" y2="49" strokeWidth="1.5"/>
              <line x1="0"  y1="54" x2="7"  y2="54" strokeWidth="1"/>
            </g>
          </svg>
        </div>
      )}

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
                      {user?.role === 'accountant' ? 'Kế toán' : user?.role === 'director' ? 'Giám đốc' : user?.role === 'superadmin' ? 'Quản trị' : user?.role}
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
                {notificationsPath && (
                  <DropdownMenuItem onClick={() => navigate(notificationsPath)}>
                    <Bell className="mr-2 h-4 w-4" />
                    Thông báo
                  </DropdownMenuItem>
                )}
                {profilePath && (
                  <DropdownMenuItem onClick={() => navigate(profilePath)}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    Thông tin cá nhân
                  </DropdownMenuItem>
                )}
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

      {/* Collapse / expand toggle — on the right edge, desktop only */}
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className="absolute top-[44px] -right-3 z-10 w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:brightness-110"
          style={{
            background: 'var(--theme-sidebar)',
            border: '1px solid var(--theme-sidebar-border)',
            color: 'var(--theme-sidebar-text-muted)',
          }}
        >
          <ChevronLeft
            className={`w-3 h-3 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </aside>
  )
}
