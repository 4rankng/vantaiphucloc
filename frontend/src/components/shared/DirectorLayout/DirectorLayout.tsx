import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['director', 'superadmin']

const TITLES: Record<string, string> = {
  '/director': 'Tổng quan',
  '/director/users': 'Quản lý tài khoản',
  '/director/partners': 'Đối tác',
  '/director/routes': 'Cung đường',
  '/director/pricing': 'Bảng giá',
  '/director/trips': 'Lệnh điều hành',
  '/director/create-trip': 'Tạo lệnh điều hành',
  '/director/notifications': 'Thông báo',
  '/director/profile': 'Thông tin cá nhân',
}

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/director/driver-jobs/')) return 'Tài xế'
  if (pathname.startsWith('/director/client-jobs/')) return 'Khách hàng'
  if (pathname.startsWith('/director/trip/')) return 'Chi tiết lệnh'
  return ''
}

function DirectorShell() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isHome = location.pathname === '/director'
  const title = resolveTitle(location.pathname)

  return (
    <AppShell
      topbarProps={
        isHome
          ? {
              variant: 'home' as const,
              name: user?.name ?? '',
              onNotifications: () => navigate('/director/notifications'),
            }
          : { variant: 'page' as const, title, onBack: () => navigate(-1) }
      }
      contentClassName="px-4 py-4 space-y-4 md:px-6 md:py-6 md:max-w-4xl md:mx-auto"
    >
      <Outlet />
    </AppShell>
  )
}

export function DirectorLayout() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <DirectorShell />
}
