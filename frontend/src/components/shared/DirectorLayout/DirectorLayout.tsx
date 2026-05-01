import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['director', 'superadmin']

const TITLES: Record<string, string> = {
  '/director': 'Tổng quan',
  '/director/users': 'Quản lý tài khoản',
  '/director/notifications': 'Thông báo',
  '/director/profile': 'Thông tin cá nhân',
}

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/director/driver-jobs/')) return 'Tài xế'
  if (pathname.startsWith('/director/client-jobs/')) return 'Khách hàng'
  return ''
}

function DirectorShell() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const isHome = location.pathname === '/director'
  const title = resolveTitle(location.pathname)

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
        contentClassName="px-4 py-4 space-y-4 md:px-6 md:py-6 md:max-w-3xl md:mx-auto"
      >
        <Outlet />
      </AppShell>
      <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
    </>
  )
}

export function DirectorLayout() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <DirectorShell />
}
