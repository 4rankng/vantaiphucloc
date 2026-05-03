import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
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

// Desktop: ≥ 1024px — fixed sidebar, no toggle
function AccountantDesktopShell() {
  const location = useLocation()
  const [notifOpen, setNotifOpen] = useState(false)
  const isFullscreen = FULLSCREEN_PREFIXES.some(p => location.pathname.startsWith(p))
  const { open: cmdOpen, close: closeCmdPalette } = useCommandPalette()

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden" style={{ background: 'var(--theme-bg-primary)' }}>
      {/* Fixed sidebar — always visible, no collapse */}
      {!isFullscreen && (
        <AccountantSidebar
          collapsed={false}
          onNotificationsOpen={() => setNotifOpen(true)}
        />
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className={isFullscreen ? 'h-full' : 'px-6 py-6 mx-auto max-w-7xl'}>
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)

  const isHome = location.pathname === '/accountant'
  const isSubPage = !isHome
  const isFullscreen = FULLSCREEN_PREFIXES.some(p => location.pathname.startsWith(p))

  const openSidebar = useCallback(() => {
    setDrawerVisible(true)
    // Small delay so the element is in the DOM before we animate it in
    requestAnimationFrame(() => setSidebarOpen(true))
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
    // Wait for slide-out animation before unmounting
    setTimeout(() => setDrawerVisible(false), 280)
  }, [])

  const toggleSidebar = useCallback(() => {
    if (drawerVisible) closeSidebar()
    else openSidebar()
  }, [drawerVisible, openSidebar, closeSidebar])

  // Auto-close sidebar on navigation
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
        onBack: isSubPage ? () => navigate(-1) : undefined,
      }

  return (
    <>
      <AppShell
        topbarProps={topbarProps}
        topbarTheme="dark"
        contentClassName={
          isFullscreen
            ? undefined
            : 'px-4 py-4 space-y-4'
        }
      >
        <Outlet />
      </AppShell>

      {/* Animated sidebar drawer */}
      {drawerVisible && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop — fades in/out */}
          <div
            className="absolute inset-0"
            style={{
              background: 'rgba(0,0,0,0.5)',
              opacity: sidebarOpen ? 1 : 0,
              transition: 'opacity 280ms ease',
            }}
            onClick={closeSidebar}
          />

          {/* Drawer panel — slides in from left */}
          <div
            className="relative z-10 h-full flex flex-col"
            style={{
              width: SIDEBAR_EXPANDED,
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1)',
              background: 'var(--theme-sidebar, #0a3520)',
            }}
          >
            {/* Close button — overlaid on the sidebar header */}
            <button
              onClick={closeSidebar}
              className="absolute top-3.5 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full shrink-0"
              style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)' }}
              aria-label="Đóng menu"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Full sidebar (logo + nav + user footer) */}
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
    '/accountant/driver-trips': 'Chuyến đã đi',
    '/accountant/work-orders': 'Đối soát',
    '/accountant/partners': 'Đối tác',
    '/accountant/routes': 'Cung đường',
    '/accountant/pricing': 'Bảng giá',
    '/accountant/salary-setup': 'Kỳ lương',
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

export function AccountantLayout() {
  const { user } = useAuth()
  // Desktop = ≥ 1024px (laptop+), everything smaller gets the mobile/tablet shell
  const isDesktop = useIsDesktop()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return isDesktop ? <AccountantDesktopShell /> : <AccountantMobileShell />
}
