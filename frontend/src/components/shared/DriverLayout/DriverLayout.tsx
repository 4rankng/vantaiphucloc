import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/shared/AppSidebar'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['driver']

const TITLES: Record<string, string> = {
  '/driver/work-orders/new': 'Tạo chuyến',
  '/driver/history': 'Lịch sử',
  '/driver/notifications': 'Thông báo',
  '/driver/profile': 'Hồ sơ',
}

function DriverInner() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const isHome = location.pathname === '/driver'

  let title = TITLES[location.pathname] ?? ''
  if (location.pathname.startsWith('/driver/job/')) title = 'Chi tiết chuyến'

  if (isMobile) {
    return (
      <>
        <AppShell
          topbarProps={
            isHome
              ? {
                  variant: 'home' as const,
                  name: user?.name ?? '',
                  onNotifications: () => navigate('/driver/notifications'),
                  onProfile: () => setDropdownOpen(true),
                }
              : { variant: 'page' as const, title, onBack: () => navigate(-1) }
          }
          contentClassName="p-4 space-y-4"
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
      <AppSidebar role="driver" />
      <main className="flex-1 min-h-screen overflow-auto" style={{ background: 'var(--theme-bg-primary)' }}>
        <div className="mx-auto w-full max-w-5xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </>
  )
}

export function DriverLayout() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <DriverInner />
    </SidebarProvider>
  )
}
