import { Outlet, useNavigate, Navigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
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
        actions: (
          <button
            onClick={() => navigate('/driver/work-orders/new')}
            className="w-8 h-8 flex items-center justify-center rounded-full touch-manipulation"
            style={{ background: 'rgba(5, 150, 105, 0.08)', color: 'var(--theme-brand-primary)' }}
            aria-label="Tạo chuyến"
          >
            <Plus className="w-[17px] h-[17px]" />
          </button>
        ),
      }}
      contentClassName="px-4 py-4 pb-28 space-y-4 md:px-6 md:py-6 md:pb-28 md:max-w-md md:mx-auto"
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
