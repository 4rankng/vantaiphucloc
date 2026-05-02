import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { AccountantSidebar } from '@/components/shared/AccountantSidebar'
import { CommandPalette, useCommandPalette } from '@/components/shared/CommandPalette'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { NotificationPanel, useUnreadCount } from '@/components/shared/NotificationPanel/NotificationPanel'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import {
  Search,
  Command as CmdIcon,
  Bell,
  UserCircle,
  ChevronRight,
} from 'lucide-react'
import { useState, useRef } from 'react'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['accountant']

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

const SIDEBAR_EXPANDED = 240
const SIDEBAR_COLLAPSED = 72

function AccountantDesktopShell() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const profileBtnRef = useRef<HTMLDivElement>(null)
  const unread = useUnreadCount()
  const isFullscreen = FULLSCREEN_PREFIXES.some(p => location.pathname.startsWith(p))
  const { open: cmdOpen, setOpen: setCmdOpen, close: closeCmdPalette } = useCommandPalette()

  const pageTitle = resolveTitle(location.pathname)

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden" style={{ background: 'var(--theme-bg-primary)' }}>
      {/* Sidebar */}
      {!isFullscreen && (
        <AccountantSidebar
          collapsed={sidebarCollapsed}
        />
      )}

      {/* Sidebar toggle — fixed pill on sidebar edge */}
      {!isFullscreen && (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className="fixed z-50 top-4 flex items-center justify-center w-2.5 h-9 rounded-r-md shadow-sm text-neutral-300 transition-all duration-300 ease-in-out"
          style={{
            left: sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
            background: '#0a3520',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform duration-200 ${!sidebarCollapsed ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Desktop header */}
        <header
          className="shrink-0 z-20 w-full"
          style={{
            background: 'var(--theme-bg-secondary)',
            borderBottom: '1px solid var(--theme-border-default)',
          }}
        >
          <div className="flex items-center gap-4 px-6 py-3">
            {/* Page title for context */}
            {pageTitle && (
              <h1
                className="hidden xl:block text-base font-semibold font-display truncate"
                style={{ color: 'var(--theme-text-primary)' }}
              >
                {pageTitle}
              </h1>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Search bar - Command palette trigger */}
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-3 rounded-xl border px-4 py-2 text-sm transition hover:border-[color-mix(in_srgb,var(--theme-brand-primary)_40%,transparent)] w-full max-w-md"
              style={{
                background: 'var(--theme-bg-primary)',
                borderColor: 'var(--theme-border-default)',
                color: 'var(--theme-text-muted)',
              }}
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Tìm kiếm nhanh...</span>
              <kbd
                className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-mono"
                style={{
                  borderColor: 'var(--theme-border-default)',
                  background: 'var(--theme-bg-tertiary)',
                  color: 'var(--theme-text-muted)',
                }}
              >
                <CmdIcon className="h-3 w-3" />K
              </kbd>
            </button>

            {/* Bell */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl transition touch-manipulation"
              style={{
                background: 'var(--theme-bg-primary)',
                border: '1px solid var(--theme-border-default)',
                color: 'var(--theme-text-primary)',
              }}
              aria-label="Thông báo"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold leading-none px-1"
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
                className="flex h-10 w-10 items-center justify-center rounded-xl transition touch-manipulation"
                style={{
                  background: 'var(--theme-bg-primary)',
                  border: '1px solid var(--theme-border-default)',
                  color: 'var(--theme-text-primary)',
                }}
                aria-label="Tài khoản"
              >
                <UserCircle className="h-[18px] w-[18px]" />
              </button>
              <UserDropdown
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                anchorRef={profileBtnRef}
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-y-auto ${isFullscreen ? '' : 'px-6 py-6'}`}>
          <div className={isFullscreen ? 'h-full' : 'mx-auto max-w-7xl'}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Notification panel */}
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Command palette */}
      <CommandPalette open={cmdOpen} onClose={closeCmdPalette} />
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
