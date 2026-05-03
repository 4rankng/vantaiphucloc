import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Bell,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { SuperAdminSidebar } from '@/components/shared/SuperAdminSidebar'
import { BottomTabBar } from '@/components/shared/BottomTabBar/BottomTabBar'
import { AppTopBar } from '@/components/shared/AppTopBar'

interface SuperAdminTabItem {
  path: string
  label: string
  icon: React.ElementType
}

const NAV_ITEMS: SuperAdminTabItem[] = [
  { path: '/superadmin', label: 'Tổng quan', icon: LayoutDashboard },
  { path: '/superadmin/users', label: 'Người dùng', icon: Users },
  { path: '/superadmin/notifications', label: 'Thông báo', icon: Bell },
]

export function SuperAdminLayout() {
  const { user } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  if (!user || user.role !== 'superadmin') {
    return <Navigate to="/" replace />
  }

  const tabItems = NAV_ITEMS.map(item => ({
    path: item.path,
    label: item.label,
    icon: item.icon,
    exact: item.path === '/superadmin',
  }))

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--theme-bg-primary)' }}>
      {/* Desktop sidebar (hidden on mobile) */}
      <SuperAdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-auto">
        {/* Mobile topbar (hidden on lg+) */}
        <header className="lg:hidden z-20 w-full shrink-0" style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', borderBottom: '1px solid var(--theme-header-border, rgba(0, 0, 0, 0.06))' }}>
          <AppTopBar
            variant="home"
            name={user?.name ?? ''}
            theme="light"
          />
        </header>

        {/* Page content */}
        <main className="flex-1 flex flex-col pb-14 lg:pb-0">
          <div className="page-container flex-1">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom tab bar (hidden on lg+) */}
        <div className="lg:hidden">
          <BottomTabBar tabs={tabItems} />
        </div>
      </div>
    </div>
  )
}
