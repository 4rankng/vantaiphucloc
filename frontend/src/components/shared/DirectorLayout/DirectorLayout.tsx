import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['director', 'superadmin']

export function DirectorLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  const isHome = location.pathname === '/director'

  let title = ''
  if (location.pathname === '/director/users') title = 'Quản lý tài khoản'
  else if (location.pathname === '/director/notifications') title = 'Thông báo'
  else if (location.pathname.startsWith('/director/driver-jobs/')) title = 'Tài xế'
  else if (location.pathname.startsWith('/director/client-jobs/')) title = 'Khách hàng'

  return (
    <AppShell
      topbarProps={
        isHome
          ? {
              variant: 'home',
              name: user.name,
              onNotifications: () => navigate('/director/notifications'),
              onProfile: () => setDropdownOpen(true),
            }
          : { variant: 'page', title, onBack: () => navigate(-1) }
      }
    >
      <Outlet />
      <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
    </AppShell>
  )
}
