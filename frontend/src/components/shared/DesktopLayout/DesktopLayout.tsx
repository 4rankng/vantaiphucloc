import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, Plus, Clock, Bell, User, Users, Truck, Receipt,
  Route, Briefcase, FileText, DollarSign, UserCog, Settings,
  Handshake, ChevronLeft, ChevronRight, LogOut, ChevronUp,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useUnreadCount } from '@/components/shared/NotificationPanel/NotificationPanel'
import { SidebarProfileDialog } from '@/components/shared/ProfileDialog'
import type { ReactNode } from 'react'

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  exact?: boolean
  badge?: number
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const DRIVER_NAV: NavGroup[] = [
  {
    items: [
      { path: '/driver', label: 'Trang chủ', icon: Home, exact: true },
      { path: '/driver/work-orders/new', label: 'Tạo chuyến', icon: Plus },
      { path: '/driver/history', label: 'Lịch sử', icon: Clock },
      { path: '/driver/notifications', label: 'Thông báo', icon: Bell },
      { path: '/driver/profile', label: 'Hồ sơ', icon: User },
    ],
  },
]

const ACCOUNTANT_NAV: NavGroup[] = [
  {
    items: [
      { path: '/accountant', label: 'Tổng quan', icon: Home, exact: true },
      { path: '/accountant/notifications', label: 'Thông báo', icon: Bell },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { path: '/accountant/trips', label: 'Chuyến', icon: Truck },
      { path: '/accountant/work-orders', label: 'Đối soát tài xế', icon: Briefcase },
    ],
  },
  {
    label: 'Danh mục',
    items: [
      { path: '/accountant/pricing', label: 'Bảng giá', icon: Receipt },
      { path: '/accountant/partners', label: 'Đối tác', icon: Handshake },
      { path: '/accountant/routes', label: 'Cung đường', icon: Route },
    ],
  },
  {
    label: 'Tài chính',
    items: [
      { path: '/accountant/salary-setup', label: 'Kỳ lương', icon: Settings },
    ],
  },
]

const DIRECTOR_NAV: NavGroup[] = [
  {
    items: [
      { path: '/director', label: 'Tổng quan', icon: Home, exact: true },
      { path: '/director/notifications', label: 'Thông báo', icon: Bell },
    ],
  },
  {
    label: 'Quản lý',
    items: [
      { path: '/director/users', label: 'Tài khoản', icon: UserCog },
    ],
  },
]

const NAV_CONFIG: Record<string, NavGroup[]> = {
  driver: DRIVER_NAV,
  accountant: ACCOUNTANT_NAV,
  director: DIRECTOR_NAV,
}

const ROLE_LABELS: Record<string, string> = {
  driver: 'Tài xế',
  accountant: 'Kế toán',
  director: 'Giám đốc',
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────

function SidebarNavItem({
  item,
  collapsed,
  unread,
}: {
  item: NavItem
  collapsed: boolean
  unread?: number
}) {
  const location = useLocation()
  const isActive = item.exact
    ? location.pathname === item.path
    : location.pathname === item.path || location.pathname.startsWith(item.path + '/')

  const badge = item.path.includes('notifications') ? unread : undefined

  const inner = (
    <NavLink
      to={item.path}
      className={cn(
        'relative flex items-center gap-3 rounded-xl transition-all duration-150 select-none group/item',
        collapsed ? 'h-10 w-10 justify-center mx-auto' : 'h-9 px-3',
        isActive
          ? 'bg-white/[0.18] text-white shadow-sm'
          : 'text-white/70 hover:bg-white/[0.08] hover:text-white',
      )}
    >
      {/* Active pill */}
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white/90" />
      )}

      <item.icon className={cn('shrink-0', collapsed ? 'w-[18px] h-[18px]' : 'w-4 h-4')} />

      {!collapsed && (
        <span className={cn('text-[13px] leading-none flex-1 truncate', isActive ? 'font-semibold' : 'font-normal')}>
          {item.label}
        </span>
      )}

      {/* Notification badge */}
      {badge != null && badge > 0 && (
        <span
          className={cn(
            'flex items-center justify-center rounded-full text-[10px] font-bold leading-none text-white',
            collapsed
              ? 'absolute -top-1 -right-1 min-w-[16px] h-4 px-1'
              : 'min-w-[18px] h-[18px] px-1 shrink-0',
          )}
          style={{ background: 'var(--theme-status-error)' }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <div className="relative group/tooltip">
        {inner}
        {/* Tooltip */}
        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150">
          <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            {item.label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
          </div>
        </div>
      </div>
    )
  }

  return inner
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

interface DesktopSidebarProps {
  role: string
  collapsed: boolean
  onToggle: () => void
}

function DesktopSidebar({ role, collapsed, onToggle }: DesktopSidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const unread = useUnreadCount()
  const [profileOpen, setProfileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const footerRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const footerBtnRef = useRef<HTMLButtonElement>(null)
  const groups = NAV_CONFIG[role] ?? []

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const inFooter = footerRef.current?.contains(target)
      const inPopup = popupRef.current?.contains(target)
      if (!inFooter && !inPopup) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/')
  }, [logout, navigate])

  // Compute popup position from footer button
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({})
  useEffect(() => {
    if (!userMenuOpen || !footerBtnRef.current) return
    const rect = footerBtnRef.current.getBoundingClientRect()
    setPopupStyle({
      position: 'fixed',
      bottom: window.innerHeight - rect.top + 8,
      left: rect.left,
      width: collapsed ? 160 : rect.width,
    })
  }, [userMenuOpen, collapsed])

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col transition-[width] duration-200 ease-out',
          collapsed ? 'w-[60px]' : 'w-[220px]',
        )}
        style={{
          background: 'var(--theme-sidebar, #00782f)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo / brand */}
        <div
          className={cn(
            'flex items-center shrink-0 h-14',
            collapsed ? 'justify-center px-0' : 'gap-2.5 px-4',
          )}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <img src="/logo.avif" alt="Logo" className="h-7 w-7 shrink-0 object-contain rounded-md" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-white/95 leading-tight truncate">Vận Tải Phúc Lộc</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.label && !collapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] px-3 mb-1.5 text-white/40">
                  {group.label}
                </p>
              )}
              {collapsed && gi > 0 && (
                <div className="w-6 h-px mx-auto mb-2" style={{ background: 'rgba(255,255,255,0.1)' }} />
              )}
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <SidebarNavItem
                    key={item.path}
                    item={item}
                    collapsed={collapsed}
                    unread={item.path.includes('notifications') ? unread : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div
          className="shrink-0 p-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          ref={footerRef}
        >
          <button
            ref={footerBtnRef}
            onClick={() => setUserMenuOpen(v => !v)}
            className={cn(
              'w-full flex items-center rounded-xl transition-all duration-150 cursor-pointer',
              'hover:bg-white/[0.08]',
              collapsed ? 'h-10 w-10 justify-center mx-auto' : 'gap-2.5 px-2.5 py-2',
            )}
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[12px] font-medium text-white/90 truncate leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-white/45 leading-tight">{ROLE_LABELS[role] ?? role}</p>
                </div>
                <ChevronUp
                  className={cn('w-3.5 h-3.5 shrink-0 text-white/40 transition-transform duration-150', userMenuOpen && 'rotate-180')}
                />
              </>
            )}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-[52px] w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-colors z-50"
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
            color: 'var(--theme-text-muted)',
          }}
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* User menu popup — rendered outside aside to avoid overflow clipping */}
      {userMenuOpen && (
        <div
          ref={popupRef}
          className="rounded-xl overflow-hidden shadow-xl z-[60]"
          style={{
            ...popupStyle,
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
          }}
        >
          <button
            onClick={() => { setProfileOpen(true); setUserMenuOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--theme-bg-tertiary)]"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            <User className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
            Thông tin
          </button>
          <div style={{ borderTop: '1px solid var(--theme-border-light)' }} />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-red-50"
            style={{ color: 'var(--theme-status-error)' }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Đăng xuất
          </button>
        </div>
      )}

      <SidebarProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}

// ─── Desktop header ───────────────────────────────────────────────────────────

function DesktopHeader({ title, sidebarWidth }: { title: string; sidebarWidth: number }) {
  const unread = useUnreadCount()
  const { user } = useAuth()

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center h-14 px-6 gap-4"
      style={{
        left: sidebarWidth,
        background: 'var(--theme-bg-secondary)',
        borderBottom: '1px solid var(--theme-border-default)',
        transition: 'left 200ms ease-out',
      }}
    >
      {/* Page title */}
      <h1 className="text-[15px] font-semibold flex-1 truncate" style={{ color: 'var(--theme-text-primary)' }}>
        {title}
      </h1>

      {/* Right actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notification bell */}
        <div className="relative">
          <NavLink
            to={`/${user?.role}/notifications`}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--theme-bg-tertiary)]"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            <Bell className="w-4 h-4" />
          </NavLink>
          {unread > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1"
              style={{ background: 'var(--theme-status-error)' }}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}

// ─── Desktop layout ───────────────────────────────────────────────────────────

interface DesktopLayoutProps {
  role: string
  title: string
  children: ReactNode
}

const SIDEBAR_EXPANDED = 220
const SIDEBAR_COLLAPSED = 60

export function DesktopLayout({ role, title, children }: DesktopLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  const toggle = useCallback(() => {
    setCollapsed(v => {
      const next = !v
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch { /* */ }
      return next
    })
  }, [])

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED

  return (
    <div className="min-h-screen" style={{ background: 'var(--theme-bg-primary)' }}>
      <DesktopSidebar role={role} collapsed={collapsed} onToggle={toggle} />
      <DesktopHeader title={title} sidebarWidth={sidebarWidth} />

      {/* Main content — offset by sidebar + header */}
      <main
        className="min-h-screen pt-14 transition-[padding-left] duration-200 ease-out"
        style={{ paddingLeft: sidebarWidth }}
      >
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
