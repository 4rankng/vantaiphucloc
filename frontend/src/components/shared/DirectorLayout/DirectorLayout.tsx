import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/shared/AppSidebar'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['director', 'superadmin']

const TITLES: Record<string, string> = {
  '/director/users': 'Quản lý tài khoản',
  '/director/notifications': 'Thông báo',
}

function DirectorInner() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const isHome = location.pathname === '/director'

  let title = TITLES[location.pathname] ?? ''
  if (location.pathname.startsWith('/director/driver-jobs/')) title = 'Tài xế'
  else if (location.pathname.startsWith('/director/client-jobs/')) title = 'Khách hàng'

  if (isMobile) {
    return (
      <>
        <AppShell
          topbarProps={
            isHome
              ? {
                  variant: 'home' as const,
                  name: user?.name ?? '',
                  onNotifications: () => navigate('/director/notifications'),
                  onProfile: () => setDropdownOpen(true),
                }
              : { variant: 'page' as const, title, onBack: () => navigate(-1) }
          }
        >
          <Outlet />
        </AppShell>
        <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
      </>
    )
  }

  // Desktop: sidebar layout
  return (
    <>
      <AppSidebar role="director" />
      <main className="flex-1 min-h-screen overflow-auto" style={{ background: 'var(--theme-bg-primary)' }}>
        <div className="mx-auto w-full max-w-5xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </>
  )
}

export function DirectorLayout() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <DirectorInner />
    </SidebarProvider>
  )
}
