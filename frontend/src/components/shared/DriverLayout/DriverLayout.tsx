import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { DesktopLayout } from '@/components/shared/DesktopLayout'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['driver']

const TITLES: Record<string, string> = {
  '/driver': 'Trang chủ',
  '/driver/work-orders/new': 'Tạo chuyến',
  '/driver/history': 'Lịch sử',
  '/driver/notifications': 'Thông báo',
  '/driver/profile': 'Hồ sơ',
}

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/driver/job/')) return 'Chi tiết chuyến'
  return ''
}

// ─── Mobile ───────────────────────────────────────────────────────────────────

function DriverMobile() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const isHome = location.pathname === '/driver'
  const title = resolveTitle(location.pathname)

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
        contentClassName="px-4 py-4 space-y-4"
      >
        <Outlet />
      </AppShell>
      <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
    </>
  )
}

// ─── Desktop ──────────────────────────────────────────────────────────────────

function DriverDesktop() {
  const location = useLocation()
  const title = resolveTitle(location.pathname)

  return (
    <DesktopLayout role="driver" title={title}>
      <Outlet />
    </DesktopLayout>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function DriverLayout() {
  const { user } = useAuth()
  const isMobile = useIsMobile()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return isMobile ? <DriverMobile /> : <DriverDesktop />
}
