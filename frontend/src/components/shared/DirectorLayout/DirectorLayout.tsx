import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { SidebarLayout } from '@/components/shared/SidebarLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
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

export function DirectorLayout() {
  const { user } = useAuth()
  const isMobile = useIsMobile(1024)

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  if (isMobile) {
    return <DirectorMobile />
  }

  return <SidebarLayout role={user!.role} titleMap={TITLES} />
}

function DirectorMobile() {
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
      contentClassName="px-4 py-4 space-y-4"
    >
      <Outlet />
    </AppShell>
  )
}
