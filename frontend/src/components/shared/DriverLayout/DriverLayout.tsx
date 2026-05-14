import { Outlet, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'
import { useIsMobile } from '@/hooks/use-mobile'
import { DesktopShell } from '@/components/shared/DesktopShell/DesktopShell'
import { DRIVER_NAV } from '@/components/shared/DesktopShell/navConfig'

const ALLOWED_ROLES: Role[] = ['driver']

function MobileDriverShell() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <AppShell
      topbarProps={{
        variant: 'home' as const,
        name: user?.name ?? '',
        onNotifications: () => navigate('/driver/notifications'),
      }}
      contentClassName="px-4 py-4 pb-28 space-y-4"
    >
      <Outlet />
    </AppShell>
  )
}

export function DriverLayout() {
  const { user } = useAuth()
  const isMobile = useIsMobile(1024)

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  if (isMobile) {
    return <MobileDriverShell />
  }

  return (
    <DesktopShell navItems={DRIVER_NAV} roleLabel="Tài xế">
      <Outlet />
    </DesktopShell>
  )
}
