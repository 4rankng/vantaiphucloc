import { useState } from 'react'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { DirectorSidebar } from '@/components/shared/DirectorSidebar/DirectorSidebar'
import { BottomTabBar, type TabItem } from '@/components/shared/BottomTabBar/BottomTabBar'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Handshake,
  Receipt,
  Bell,
} from 'lucide-react'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['director', 'superadmin']

const TAB_ITEMS: TabItem[] = [
  { path: '/director', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { path: '/director/client-jobs', label: 'Khách hàng', icon: Briefcase },
  { path: '/director/driver-jobs', label: 'Tài xế', icon: Users },
  { path: '/director/partners', label: 'Đối tác', icon: Handshake },
  { path: '/director/pricing', label: 'Bảng giá', icon: Receipt },
  { path: '/director/notifications', label: 'Thông báo', icon: Bell, badge: 'notifications' },
]

function DirectorShell() {
  const location = useLocation()
  const isMobile = useIsMobile()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-[100dvh] flex-col lg:flex-row">
      {/* Desktop sidebar — hidden on mobile */}
      <DirectorSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white lg:bg-[var(--theme-bg-primary)]">
        {/* Mobile topbar — visible only on mobile */}
        {isMobile && (
          <div
            className="h-14 lg:hidden flex items-center px-4 border-b"
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
          style={{
            paddingBottom: isMobile ? '56px' : '0', // Space for bottom nav on mobile
          }}
        >
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar — visible only on mobile */}
      {isMobile && !location.pathname.includes('/director/trips/') && !location.pathname.includes('/director/profile') && (
        <BottomTabBar tabs={TAB_ITEMS} />
      )}
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
