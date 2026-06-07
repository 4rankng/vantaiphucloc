import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/layouts/AppShell'
import { AccountantSidebar } from '@/components/shared/navigation/AccountantSidebar'
import { CommandPalette, useCommandPalette } from '@/components/shared/navigation/CommandPalette'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationPanel } from '@/components/shared/data-display/NotificationPanel'
import { Sheet, SheetContent } from '@/components/ui/Sheet'
import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['accountant', 'superadmin']

const FULLSCREEN_PREFIXES: string[] = []

const SIDEBAR_DRAWER_WIDTH = '300px'
const SIDEBAR_DRAWER_MAX = '320px'

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

  const isHome = location.pathname === '/accountant' || location.pathname === '/superadmin'
  const isFullscreen = FULLSCREEN_PREFIXES.some(p => location.pathname.startsWith(p))

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen(o => !o), [])

  // Auto-close on navigation — only when pathname actually changes after mount.
  const prevPathRef = useRef(location.pathname)
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname
      setSidebarOpen(false)
    }
  }, [location.pathname])

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

      {/* Slide-in sidebar drawer — uses Radix Sheet for clean controlled state + transitions */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          overlayClassName="bg-black/60"
          className="p-0 flex flex-col"
          style={{
            width: SIDEBAR_DRAWER_WIDTH,
            maxWidth: SIDEBAR_DRAWER_MAX,
            background: 'var(--theme-sidebar, #0a3520)',
            border: 'none',
            outline: 'none',
            borderTopRightRadius: '16px',
            borderBottomRightRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
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
        </SheetContent>
      </Sheet>
    </>
  )
}

function resolveMobileTitle(pathname: string): string {
  const TITLES: Record<string, string> = {
    '/accountant/profile': 'Thông tin cá nhân',
    '/accountant/clients': 'Chủ hàng',
    '/accountant/vendors': 'Nhà thầu',
    '/accountant/drivers': 'Lái xe',
    '/accountant/transporters': 'Vận tải',
    '/accountant/doi-soat': 'Đối soát',
    '/accountant/locations': 'Địa điểm',
    '/accountant/pnl': 'Tổng hợp',
    '/accountant/salary': 'Lương',
    '/accountant/expenses': 'Chi phí xe',
    '/accountant/settings': 'Cài đặt',
    '/accountant/settings/ky-luong': 'Kỳ lương',
    '/accountant/settings/cuoc-tuyen': 'Bảng giá cước',
    '/accountant/settings/cuoc-tra-xe-ngoai': 'Bảng phí thuê xe',
    '/accountant/settings/tac-nghiep': 'Loại tác nghiệp',
    '/superadmin/dashboard': 'Tổng quan (Giám đốc)',
    '/superadmin/partners': 'Đối tác',
    '/superadmin/pricing': 'Bảng giá',
    '/superadmin/notifications': 'Thông báo',
    '/superadmin/profile': 'Thông tin cá nhân',
  }
  if (TITLES[pathname]) return TITLES[pathname]
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
