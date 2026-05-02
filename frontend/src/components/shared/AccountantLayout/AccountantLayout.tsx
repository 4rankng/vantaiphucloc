import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { AccountantSidebar } from '@/components/shared/AccountantSidebar'
import { CommandPalette, useCommandPalette } from '@/components/shared/CommandPalette'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { NotificationPanel } from '@/components/shared/NotificationPanel/NotificationPanel'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['accountant']

const FULLSCREEN_PREFIXES = [
  '/accountant/match/',
  '/accountant/match-trip/',
]

const SIDEBAR_EXPANDED = 240
const SIDEBAR_COLLAPSED = 72

function AccountantDesktopShell() {
  const { user } = useAuth()
  const location = useLocation()
  const [notifOpen, setNotifOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isFullscreen = FULLSCREEN_PREFIXES.some(p => location.pathname.startsWith(p))
  const { open: cmdOpen, close: closeCmdPalette } = useCommandPalette()

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden" style={{ background: 'var(--theme-bg-primary)' }}>
      {/* Sidebar */}
      {!isFullscreen && (
        <AccountantSidebar
          collapsed={sidebarCollapsed}
          onNotificationsOpen={() => setNotifOpen(true)}
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
            background: 'var(--theme-sidebar, #0a3520)',
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
  const navigate = useNavigate()

  const isHome = location.pathname === '/accountant'
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
          : {
              variant: 'page' as const,
              title: resolveMobileTitle(location.pathname),
              onBack: () => navigate(-1),
            }
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
  const isMobile = useIsMobile()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return isMobile ? <AccountantMobileShell /> : <AccountantDesktopShell />
}
