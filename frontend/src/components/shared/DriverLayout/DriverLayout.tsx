import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['driver']

const TITLES: Record<string, string> = {
  '/driver': 'Trang chủ',
  '/driver/work-orders/new': 'Tạo chuyến',
  '/driver/history': 'Lịch sử',
  '/driver/notifications': 'Thông báo',
  '/driver/profile': 'Thông tin cá nhân',
}

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/driver/job/')) return 'Chi tiết chuyến'
  return ''
}

// ─── Driver layout (mobile + desktop, no sidebar) ─────────────────────────────
// On desktop the green topbar stays full-bleed; content is centred with a
// max-width cap so cards don't stretch across a wide monitor.

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
        contentClassName="px-4 py-4 space-y-4 md:px-6 md:py-6 md:max-w-4xl md:mx-auto"
      >
        <Outlet />
      </AppShell>
      <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
    </>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function DriverLayout() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <DriverMobile />
}
