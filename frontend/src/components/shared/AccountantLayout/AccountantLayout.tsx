import { Outlet, useLocation, useNavigate, Navigate, Link } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { NotificationPanel, useUnreadCount } from '@/components/shared/NotificationPanel/NotificationPanel'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { ArrowLeft, Search, Command as CmdIcon, Bell, UserCircle } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
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
  '/accountant/create-trip':      'Tạo lệnh điều hành',
  '/accountant/notifications':    'Thông báo',
  '/accountant/profile':          'Thông tin cá nhân',
}

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/accountant/trip/'))       return 'Chi tiết lệnh'
  if (pathname.startsWith('/accountant/match/'))      return 'Đối soát'
  if (pathname.startsWith('/accountant/match-trip/')) return 'Đối soát'
  return ''
}

const FULLSCREEN_PREFIXES = [
  '/accountant/match/',
  '/accountant/match-trip/',
]

function AccountantDesktopShell() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileBtnRef = useRef<HTMLDivElement>(null)
  const unread = useUnreadCount()
  const isFullscreen = FULLSCREEN_PREFIXES.some(p => location.pathname.startsWith(p))

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: 'var(--theme-bg-primary)' }}>
      {/* Desktop glass header */}
      <header
        className="sticky top-0 z-20 w-full"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          borderBottom: '1px solid var(--surface-border)',
        }}
      >
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-2.5">
          <Link to="/accountant" className="shrink-0">
            <img src="/logo.avif" alt="" className="w-8 h-8 object-contain rounded-md" />
          </Link>

          {/* Search bar */}
          <button
            onClick={() => navigate('/accountant/work-orders')}
            className="ml-2 flex flex-1 items-center gap-3 rounded-xl border px-4 py-2 text-sm transition hover:border-[color-mix(in_srgb,var(--theme-brand-primary)_40%,transparent)]"
            style={{
              background: 'var(--surface-bg)',
              borderColor: 'var(--surface-border)',
              color: 'var(--theme-text-muted)',
            }}
          >
            <Search className="h-4 w-4 shrink-0" />
            <span>Tìm khách, phiếu, tuyến, lệnh…</span>
            <kbd
              className="ml-auto inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-mono"
              style={{ borderColor: 'var(--surface-border)', background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
            >
              <CmdIcon className="h-3 w-3" />K
            </kbd>
          </button>

          {/* Bell */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative w-8 h-8 flex items-center justify-center rounded-full transition touch-manipulation"
            style={{ background: 'rgba(0, 80, 30, 0.08)', color: '#003d15' }}
            aria-label="Thông báo"
          >
            <Bell className="h-[17px] w-[17px]" />
            {unread > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold leading-none px-1"
                style={{ background: 'var(--theme-status-error)', color: '#fff' }}
              >
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {/* Profile icon only */}
          <div ref={profileBtnRef} className="relative">
            <button
              onClick={() => setProfileOpen(v => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-full transition touch-manipulation"
              style={{ background: 'rgba(0, 80, 30, 0.08)', color: '#003d15' }}
              aria-label="Tài khoản"
            >
              <UserCircle className="h-[17px] w-[17px]" />
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
      <main
        className={isFullscreen ? undefined : 'mx-auto max-w-[1400px] px-6 py-6'}
      >
        <Outlet />
      </main>

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
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
