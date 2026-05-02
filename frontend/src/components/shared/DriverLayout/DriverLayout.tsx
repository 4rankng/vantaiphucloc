import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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
  return ''
}

function DriverShell() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isHome = location.pathname === '/driver'
  const title = resolveTitle(location.pathname)

  const isCreateOrder = location.pathname === '/driver/work-orders/new'
  const showBackFab = !isHome && !isCreateOrder

  return (
    <AppShell
      topbarProps={
        isHome
          ? {
              variant: 'home' as const,
              name: user?.name ?? '',
              onNotifications: () => navigate('/driver/notifications'),
            }
          : { variant: 'page' as const, title }
      }
      contentClassName="px-4 py-4 space-y-4 md:px-6 md:py-6 md:max-w-4xl md:mx-auto"
    >
      <Outlet />

      {showBackFab && (
        <button
          onClick={() => navigate(-1)}
          className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 touch-manipulation"
          style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border-default)' }}
          aria-label="Quay lại"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      )}
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
