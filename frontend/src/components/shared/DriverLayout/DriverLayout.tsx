import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
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
  if (pathname.match(/\/driver\/work-orders\/\d+\/edit/)) return 'Sửa chuyến'
  return ''
}

function DriverShell() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isHome = location.pathname === '/driver' || location.pathname === '/driver/work-orders/new' || !!location.pathname.match(/\/driver\/work-orders\/\d+\/edit/)
  const title = resolveTitle(location.pathname)

  return (
    <AppShell
      topbarProps={
        isHome
          ? {
              variant: 'home' as const,
              name: user?.name ?? '',
              onNotifications: () => navigate('/driver/notifications'),
            }
          : { variant: 'page' as const, title, onBack: () => navigate(-1) }
      }
      contentClassName="px-4 py-4 space-y-4 md:px-6 md:py-6 md:max-w-4xl md:mx-auto"
    >
      <Outlet />
    </AppShell>
  )
}

export function DriverLayout() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <DriverShell />
}
