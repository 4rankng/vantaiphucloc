import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['accountant']

const TITLES: Record<string, string> = {
  '/accountant':                  'Tổng quan',
  '/accountant/trips':            'Lệnh điều phối',
  '/accountant/driver-trips':     'Chuyến đã đi',
  '/accountant/work-orders':      'Đối soát',
  '/accountant/pricing':          'Bảng giá',
  '/accountant/partners':         'Đối tác',
  '/accountant/routes':           'Cung đường',
  '/accountant/salary-setup':     'Kỳ lương',
  '/accountant/create-trip':      'Tạo lệnh điều hành',
  '/accountant/notifications':    'Thông báo',
  '/accountant/profile':          'Thông tin cá nhân',
}

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/accountant/trip/'))       return 'Chi tiết lệnh'
  if (pathname.startsWith('/accountant/match/'))      return 'Đối soát'
  if (pathname.startsWith('/accountant/match-trip/')) return 'Đối soát'
  return ''
}

// Full-screen pages — no content padding (match/reconciliation flows)
const FULLSCREEN_PREFIXES = [
  '/accountant/match/',
  '/accountant/match-trip/',
]

function AccountantShell() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isHome = location.pathname === '/accountant'
  const title = resolveTitle(location.pathname)
  const isFullscreen = FULLSCREEN_PREFIXES.some(p => location.pathname.startsWith(p))

  return (
    <AppShell
      topbarProps={
        isHome
          ? {
              variant: 'home' as const,
              name: user?.name ?? '',
              onNotifications: () => navigate('/accountant/notifications'),
            }
          : { variant: 'page' as const, title, onBack: () => navigate(-1) }
      }
      contentClassName={
        isFullscreen
          ? undefined
          : 'px-4 py-4 space-y-4 md:px-6 md:py-6 md:max-w-4xl md:mx-auto'
      }
    >
      <Outlet />
    </AppShell>
  )
}

export function AccountantLayout() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <AccountantShell />
}
