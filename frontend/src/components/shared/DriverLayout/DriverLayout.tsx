import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppTopBar } from '@/components/shared/AppTopBar'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'

/**
 * DriverLayout wraps all driver pages.
 * - Home (/driver): shows "home" variant top bar
 * - Sub-pages: shows "page" variant with back + title
 */
const TITLES: Record<string, string> = {
  '/driver/work-orders/new': 'Tạo chuyến',
  '/driver/history': 'Lịch sử',
  '/driver/notifications': 'Thông báo',
  '/driver/profile': 'Hồ sơ',
}

const ALLOWED_ROLES: Role[] = ['driver']

export function DriverLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  const isHome = location.pathname === '/driver'

  // Determine title for sub-pages
  let title = TITLES[location.pathname] ?? ''
  if (location.pathname.startsWith('/driver/job/')) {
    title = 'Chi tiết chuyến'
  }

  if (isHome) {
    return (
      <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
        <AppTopBar
          variant="home"
          name={user.name}
          onNotifications={() => navigate('/driver/notifications')}
          onProfile={() => setDropdownOpen(true)}
        />
        <main>
          <Outlet />
        </main>
        <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      <AppTopBar
        variant="page"
        title={title}
        onBack={() => navigate(-1)}
      />
      <main className="p-4 space-y-4">
        <Outlet />
      </main>
    </div>
  )
}
