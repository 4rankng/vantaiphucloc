import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/shared/AppSidebar'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['accountant']

const TITLES: Record<string, string> = {
  '/accountant/partners': 'Đối tác',
  '/accountant/routes': 'Cung đường',
  '/accountant/work-orders': 'Đối soát tài xế',
  '/accountant/trips': 'Chuyến',
  '/accountant/salary-setup': 'Thiết lập kỳ lương',
  '/accountant/pricing': 'Bảng giá',
  '/accountant/create-trip': 'Tạo chuyến',
  '/accountant/notifications': 'Thông báo',
}

function AccountantInner() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const isHome = location.pathname === '/accountant'
  const isFullPage = location.pathname.startsWith('/accountant/match/') || location.pathname.startsWith('/accountant/match-trip/')

  let title = TITLES[location.pathname] ?? ''
  if (location.pathname.startsWith('/accountant/trip/')) title = 'Chi tiết chuyến'
  else if (location.pathname.startsWith('/accountant/match/')) title = 'Đối soát'
  else if (location.pathname.startsWith('/accountant/match-trip/')) title = 'Đối soát'

  if (isMobile) {
    return (
      <>
        <AppShell
          topbarProps={
            isHome
              ? {
                  variant: 'home' as const,
                  name: user?.name ?? '',
                  onNotifications: () => navigate('/accountant/notifications'),
                  onProfile: () => setDropdownOpen(true),
                }
              : { variant: 'page' as const, title, onBack: () => navigate(-1) }
          }
          contentClassName={isHome || isFullPage ? undefined : 'p-4 space-y-4'}
        >
          <Outlet />
        </AppShell>
        <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
      </>
    )
  }

  // Desktop: sidebar layout
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--theme-bg-primary)' }}>
      <AppSidebar role="accountant" />
      <main className="flex-1 min-h-screen overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

export function AccountantLayout() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AccountantInner />
    </SidebarProvider>
  )
}
