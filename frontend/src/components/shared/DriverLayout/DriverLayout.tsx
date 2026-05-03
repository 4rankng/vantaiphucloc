import { Outlet, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['driver']

/**
 * Driver shell — the top bar ALWAYS shows the greeting "Xin chào, <name>"
 * across every driver page. Page titles never appear in the top bar.
 * Page-level back navigation lives inside each page body.
 */
function DriverShell() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <AppShell
      topbarProps={{
        variant: 'home' as const,
        name: user?.name ?? '',
        onNotifications: () => navigate('/driver/notifications'),
      }}
      contentClassName="px-4 py-4 pb-28 space-y-4 md:px-6 md:py-6 md:pb-28 md:max-w-4xl md:mx-auto"
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
