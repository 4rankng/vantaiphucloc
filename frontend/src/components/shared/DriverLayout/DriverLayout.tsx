import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'

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

  let title = TITLES[location.pathname] ?? ''
  if (location.pathname.startsWith('/driver/job/')) {
    title = 'Chi tiết chuyến'
  }

  if (isHome) {
    return (
      <AppShell
        topbarProps={{
          variant: 'home',
          name: user.name,
          onNotifications: () => navigate('/driver/notifications'),
          onProfile: () => setDropdownOpen(true),
        }}
      >
        <Outlet />
        <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
      </AppShell>
    )
  }

  return (
    <AppShell
      topbarProps={{
        variant: 'page',
        title,
        onBack: () => navigate(-1),
      }}
      contentClassName="p-4 space-y-4"
    >
      <Outlet />
    </AppShell>
  )
}
