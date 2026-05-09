import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { AccountantSidebar } from '@/components/shared/AccountantSidebar'
import { CommandPalette, useCommandPalette } from '@/components/shared/CommandPalette'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationPanel } from '@/components/shared/NotificationPanel/NotificationPanel'
import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['accountant']

const FULLSCREEN_PREFIXES = [
  '/accountant/match/',
  '/accountant/match-trip/',
]

const SIDEBAR_WIDTH = 240

/** true when viewport is ≥ 1024px (laptop / desktop) */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false,
  )
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isDesktop
}

// ─── Desktop shell (≥ 1024px) — fixed sidebar, topbar above content ─────────────

function AccountantDesktopShell() {
  const location = useLocation()
  const [notifOpen, setNotifOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const isFullscreen = FULLSCREEN_PREFIXES.some(p => location.pathname.startsWith(p))
  const { open: cmdOpen, close: closeCmdPalette } = useCommandPalette()

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden" style={{ background: 'var(--theme-bg-primary)' }}>
      {/* Dark slate sidebar */}
      {!isFullscreen && (
        <AccountantSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          onNotificationsOpen={() => setNotifOpen(true)}
        />
      )}

      {/* Main content area — sidebar + content, no top bar.
          Page title / breadcrumbs / actions live inside each page's <PageHeader />. */}
      <main className={`flex-1 overflow-y-auto min-w-0 bg-dot-grid`}>
        <div className={isFullscreen ? 'h-full' : 'page-container'}>
          <Outlet />
        </div>
      </main>

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
      <CommandPalette open={cmdOpen} onClose={closeCmdPalette} />
    </div>
  )
}

// ─── Mobile / tablet shell (< 1024px) — topbar + hamburger drawer ─────────────

function AccountantMobileShell() {
  const { user } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)

  const isHome = location.pathname === '/accountant'
  const isFullscreen = FULLSCREEN_PREFIXES.some(p => location.pathname.startsWith(p))

  const openSidebar = useCallback(() => {
    setDrawerVisible(true)
    requestAnimationFrame(() => setSidebarOpen(true))
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
    setTimeout(() => setDrawerVisible(false), 280)
  }, [])

  const toggleSidebar = useCallback(() => {
    if (drawerVisible) closeSidebar()
    else openSidebar()
  }, [drawerVisible, openSidebar, closeSidebar])

  // Auto-close on navigation
  useEffect(() => { closeSidebar() }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const topbarProps = isHome
    ? {
        variant: 'home' as const,
        name: user?.name ?? '',
        onMenu: toggleSidebar,
      }
    : {
        variant: 'page' as const,
        title: resolveMobileTitle(location.pathname),
        onMenu: toggleSidebar,
      }

  return (
    <>
      <AppShell
        topbarProps={topbarProps}
        topbarTheme="dark"
        contentClassName={isFullscreen ? undefined : 'px-4 py-4 space-y-4'}
      >
        <Outlet />
      </AppShell>

      {/* Slide-in sidebar drawer */}
      {drawerVisible && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: 'rgba(0,0,0,0.5)',
              opacity: sidebarOpen ? 1 : 0,
              transition: 'opacity 280ms ease',
            }}
            onClick={closeSidebar}
          />

          {/* Drawer panel */}
          <div
            className="relative z-10 h-full flex flex-col"
            style={{
              width: SIDEBAR_WIDTH,
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1)',
              background: 'var(--theme-sidebar, #0a3520)',
            }}
          >
            {/* Close button */}
            <button
              onClick={closeSidebar}
              className="absolute top-3.5 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full shrink-0"
              style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)' }}
              aria-label="Đóng menu"
            >
              <X className="w-4 h-4" />
            </button>

            <AccountantSidebar
              collapsed={false}
              forceVisible
              onNotificationsOpen={closeSidebar}
            />
          </div>
        </div>
      )}
    </>
  )
}

function resolveMobileTitle(pathname: string): string {
  const TITLES: Record<string, string> = {
    '/accountant/trips': 'Đơn hàng',
    '/accountant/work-orders': 'Ghép chuyến',
    '/accountant/settings': 'Cài đặt',
    '/accountant/settings/salary': 'Kỳ lương',
    '/accountant/settings/pricing': 'Bảng giá',
    '/accountant/settings/clients': 'Khách hàng',
    '/accountant/settings/vendors': 'Nhà thầu',
    '/accountant/settings/users': 'Người dùng',
    '/accountant/routes': 'Cung đường',
    '/accountant/notifications': 'Thông báo',
    '/accountant/profile': 'Thông tin cá nhân',
  }
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/accountant/trip/')) return 'Chi tiết lệnh'
  if (pathname.startsWith('/accountant/match/')) return 'Đối soát'
  if (pathname.startsWith('/accountant/match-trip/')) return 'Đối soát'
  if (pathname.startsWith('/accountant/pricing/')) return 'Bảng giá'
  return ''
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function AccountantLayout() {
  const { user } = useAuth()
  // ≥ 1024px → desktop sidebar layout; < 1024px → mobile/tablet topbar layout
  const isDesktop = useIsDesktop()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return isDesktop ? <AccountantDesktopShell /> : <AccountantMobileShell />
}
