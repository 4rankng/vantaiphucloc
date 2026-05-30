import { Outlet, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/layouts/AppShell'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['driver']

function MobileDriverShell() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    // On wider screens, frame the mobile shell as a centered phone-shaped
    // column so the layout remains the mobile design at any viewport.
    <div
      className="min-h-[100dvh] w-full flex justify-center"
      style={{ background: 'var(--theme-bg-primary)' }}
    >
      <div className="w-full max-w-md min-h-[100dvh] shadow-none sm:shadow-xl">
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
      </div>
    </div>
  )
}

export function DriverLayout() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  // Drivers always use the mobile shell — the desktop sidebar is reserved
  // for back-office roles (accountant, director, superadmin).
  return <MobileDriverShell />
}
