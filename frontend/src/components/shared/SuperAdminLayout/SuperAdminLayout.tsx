import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/shared/AppShell'

export function SuperAdminLayout() {
  const { user } = useAuth()

  if (!user || user.role !== 'superadmin') {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell
      topbarProps={{
        variant: 'home',
        name: user?.name ?? '',
        onNotifications: () => {},
      }}
      contentClassName="px-4 py-4 space-y-4 md:px-6 md:py-6 md:max-w-4xl md:mx-auto"
    >
      <Outlet />
    </AppShell>
  )
}
