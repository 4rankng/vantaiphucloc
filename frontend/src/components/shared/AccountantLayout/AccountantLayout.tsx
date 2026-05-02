import { Outlet, useLocation, useNavigate, Navigate, Link } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { NotificationPanel, useUnreadCount } from '@/components/shared/NotificationPanel/NotificationPanel'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { 
  LayoutDashboard, FileText, Briefcase, Users, MapPin, Tag, Wallet, 
  Bell, UserCircle, Search, ChevronRight, Menu, X,
  TrendingUp, Clock
} from 'lucide-react'
import { useState, useRef } from 'react'
import type { Role } from '@/data/domain'
import { cn } from '@/lib/utils'

const ALLOWED_ROLES: Role[] = ['accountant']

// Navigation items with icons
const NAV_ITEMS = [
  { path: '/accountant', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { path: '/accountant/trips', label: 'Lệnh điều phối', icon: FileText },
  { path: '/accountant/driver-trips', label: 'Chuyến đã đi', icon: Clock },
  { path: '/accountant/work-orders', label: 'Đối soát', icon: Briefcase },
  { path: '/accountant/partners', label: 'Đối tác', icon: Users },
  { path: '/accountant/routes', label: 'Cung đường', icon: MapPin },
  { path: '/accountant/pricing', label: 'Bảng giá', icon: Tag },
  { path: '/accountant/salary-setup', label: 'Kỳ lương', icon: Wallet },
]

const TITLES: Record<string, string> = {
  '/accountant':                  'Tổng quan',
  '/accountant/trips':            'Lệnh điều phối',
  '/accountant/driver-trips':     'Chuyến đã đi',
  '/accountant/work-orders':      'Đối soát',
  '/accountant/pricing':          'Bảng giá',
  '/accountant/partners':         'Đối tác',
  '/accountant/routes':           'Cung đường',
  '/accountant/salary-setup':     'Kỳ lương',
  '/accountant/create-trip':      'Tạo đơn hàng',
  '/accountant/notifications':    'Thông báo',
  '/accountant/profile':          'Thông tin cá nhân',
  '/accountant/customers':        'Quản lý khách hàng',
}

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/accountant/trip/'))       return 'Chi tiết lệnh'
  if (pathname.startsWith('/accountant/match/'))      return 'Đối soát'
  if (pathname.startsWith('/accountant/match-trip/')) return 'Đối soát'
  if (pathname.startsWith('/accountant/pricing/'))    return 'Bảng giá'
  return ''
}

const FULLSCREEN_PREFIXES = [
  '/accountant/match/',
  '/accountant/match-trip/',
]

// Desktop Sidebar Component
function DesktopSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <aside 
      className="fixed left-0 top-0 bottom-0 w-[240px] flex flex-col z-30"
      style={{ 
        background: 'var(--theme-bg-secondary)',
        borderRight: '1px solid var(--theme-border-default)',
      }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 shrink-0" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
        <Link to="/accountant" className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--theme-brand-primary)' }}
          >
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold font-display truncate" style={{ color: 'var(--theme-text-primary)' }}>
              Phúc Lộc
            </p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>
              Kế toán
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const active = isActive(item.path, item.exact)
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                "hover:bg-[var(--theme-bg-tertiary)] active:scale-[0.98]"
              )}
              style={{
                background: active ? 'var(--theme-brand-primary-light)' : 'transparent',
                color: active ? 'var(--theme-brand-primary)' : 'var(--theme-text-secondary)',
              }}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
              {active && (
                <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-50" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer - version */}
      <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
        <p className="text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>
          Vận tải Phúc Lộc v2.0
        </p>
      </div>
    </aside>
  )
}

// Desktop Top Header
function DesktopHeader() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileBtnRef = useRef<HTMLDivElement>(null)
  const unread = useUnreadCount()

  const pageTitle = resolveTitle(location.pathname)

  return (
    <>
      <header
        className="sticky top-0 z-20 h-16 flex items-center justify-between gap-4 px-6"
        style={{
          background: 'var(--theme-bg-secondary)',
          borderBottom: '1px solid var(--theme-border-default)',
        }}
      >
        {/* Page title */}
        <div className="min-w-0">
          <h1 className="text-lg font-bold font-display truncate" style={{ color: 'var(--theme-text-primary)' }}>
            {pageTitle}
          </h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <button
            onClick={() => navigate('/accountant/work-orders')}
            className="flex items-center gap-2.5 h-10 px-4 rounded-xl text-sm transition hover:bg-[var(--theme-bg-tertiary)]"
            style={{
              background: 'var(--theme-bg-tertiary)',
              color: 'var(--theme-text-muted)',
            }}
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline">Tìm kiếm...</span>
            <kbd
              className="hidden lg:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-muted)' }}
            >
              ⌘K
            </kbd>
          </button>

          {/* Notifications */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl transition hover:bg-[var(--theme-bg-tertiary)]"
            style={{ color: 'var(--theme-text-secondary)' }}
            aria-label="Thông báo"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unread > 0 && (
              <span
                className="absolute top-1.5 right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold px-1"
                style={{ background: 'var(--theme-status-error)', color: '#fff' }}
              >
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {/* Profile */}
          <div ref={profileBtnRef} className="relative">
            <button
              onClick={() => setProfileOpen(v => !v)}
              className="flex items-center gap-2 h-10 pl-2 pr-3 rounded-xl transition hover:bg-[var(--theme-bg-tertiary)]"
              style={{ color: 'var(--theme-text-secondary)' }}
            >
              <div 
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--theme-brand-primary-light)' }}
              >
                <UserCircle className="w-4 h-4" style={{ color: 'var(--theme-brand-primary)' }} />
              </div>
              <span className="text-sm font-medium hidden lg:inline" style={{ color: 'var(--theme-text-primary)' }}>
                {user?.name?.split(' ').pop() ?? 'Tài khoản'}
              </span>
            </button>
            <UserDropdown
              open={profileOpen}
              onClose={() => setProfileOpen(false)}
              anchorRef={profileBtnRef}
            />
          </div>
        </div>
      </header>

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}

function AccountantDesktopShell() {
  const location = useLocation()
  const isFullscreen = FULLSCREEN_PREFIXES.some(p => location.pathname.startsWith(p))

  return (
    <div className="min-h-screen" style={{ background: 'var(--theme-bg-primary)' }}>
      {/* Sidebar */}
      {!isFullscreen && <DesktopSidebar />}
      
      {/* Main content area */}
      <div className={cn(!isFullscreen && "ml-[240px]")}>
        {!isFullscreen && <DesktopHeader />}
        
        <main className={cn(
          isFullscreen ? "" : "px-6 py-6 min-h-[calc(100vh-64px)]"
        )}>
          <div className={cn(!isFullscreen && "max-w-[1400px] mx-auto")}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function AccountantMobileShell() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isHome = location.pathname === '/accountant'
  const title = resolveTitle(location.pathname)
  const isFullscreen = FULLSCREEN_PREFIXES.some(p => location.pathname.startsWith(p))

  return (
    <AppShell
      topbarProps={
        isHome
          ? {
              variant: 'home' as const,
              name: user?.name ?? '',
              onNotifications: () => navigate('/accountant/notifications'),
            }
          : { variant: 'page' as const, title, onBack: () => navigate(-1) }
      }
      contentClassName={
        isFullscreen
          ? undefined
          : 'px-4 py-4 space-y-4 md:px-6 md:py-6 md:max-w-4xl md:mx-auto'
      }
    >
      <Outlet />
    </AppShell>
  )
}

export function AccountantLayout() {
  const { user } = useAuth()
  const isMobile = useIsMobile()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return isMobile ? <AccountantMobileShell /> : <AccountantDesktopShell />
}
