import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { DesktopTopNav, type DesktopTopNavItem } from '@/components/shared/DesktopTopNav'
import { BottomTabBar, type TabItem } from '@/components/shared/BottomTabBar/BottomTabBar'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  LayoutDashboard,
  Handshake,
  Receipt,
  Users,
  Bell,
} from 'lucide-react'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['director', 'superadmin']

const DESKTOP_NAV: DesktopTopNavItem[] = [
  { href: '/director', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { href: '/director/partners', label: 'Đối tác', icon: Handshake },
  { href: '/director/pricing', label: 'Bảng giá', icon: Receipt },
  { href: '/director/users', label: 'Tài khoản', icon: Users },
  { href: '/director/notifications', label: 'Thông báo', icon: Bell },
]

const MOBILE_TABS: TabItem[] = [
  { path: '/director', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { path: '/director/partners', label: 'Đối tác', icon: Handshake },
  { path: '/director/pricing', label: 'Bảng giá', icon: Receipt },
  { path: '/director/users', label: 'Tài khoản', icon: Users },
  { path: '/director/notifications', label: 'Thông báo', icon: Bell, badge: 'notifications' },
]

function DirectorShell() {
  const location = useLocation()
  const isMobile = useIsMobile()

  const hideMobileTabs = isMobile && (
    location.pathname.includes('/director/trips/') ||
    location.pathname.includes('/director/profile')
  )

  return (
    <div className="flex h-[100dvh] flex-col" style={{ background: 'var(--theme-bg-primary)' }}>
      {/* Desktop top nav — visible only on lg+ */}
      <DesktopTopNav
        brandLabel="Giám đốc"
        items={DESKTOP_NAV}
        rootPath="/director"
        profilePath="/director/profile"
        notificationsPath="/director/notifications"
      />

      {/* Mobile topbar */}
      {isMobile && (
        <div
          className="h-14 flex items-center px-4 border-b shrink-0"
          style={{
            background: 'var(--theme-bg-secondary)',
            borderColor: 'var(--theme-border-default)',
          }}
        >
          <img src="/logo.avif" alt="" className="h-6 w-6 object-contain rounded-sm" />
        </div>
      )}

      {/* Page content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: isMobile ? '56px' : '0' }}
      >
        <div className="page-container">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      {!hideMobileTabs && <BottomTabBar tabs={MOBILE_TABS} />}
    </div>
  )
}

export function DirectorLayout() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <DirectorShell />
}
