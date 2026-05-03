import { Navigate, Outlet } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { DesktopTopNav, type DesktopTopNavItem } from '@/components/shared/DesktopTopNav'
import { BottomTabBar } from '@/components/shared/BottomTabBar/BottomTabBar'
import { useIsMobile } from '@/hooks/use-mobile'

const DESKTOP_NAV: DesktopTopNavItem[] = [
  { href: '/superadmin', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
]

const MOBILE_TABS = [
  { path: '/superadmin', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
]

export function SuperAdminLayout() {
  const { user } = useAuth()
  const isMobile = useIsMobile()

  if (!user || user.role !== 'superadmin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex h-[100dvh] flex-col" style={{ background: 'var(--theme-bg-primary)' }}>
      <DesktopTopNav
        brandLabel="Quản trị"
        items={DESKTOP_NAV}
        rootPath="/superadmin"
        profilePath="/superadmin/profile"
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

      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: isMobile ? '56px' : '0' }}
      >
        <div className="page-container">
          <Outlet />
        </div>
      </main>

      <BottomTabBar tabs={MOBILE_TABS} />
    </div>
  )
}
