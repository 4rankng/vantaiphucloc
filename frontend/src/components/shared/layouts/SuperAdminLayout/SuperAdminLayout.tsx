import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/layouts/AppShell'
import { useAuth } from '@/contexts/AuthContext'

export function SuperAdminLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user || user.role !== 'superadmin') {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell
      topbarProps={{
        variant: 'home' as const,
        name: user?.name ?? '',
        onNotifications: () => navigate('/superadmin/notifications'),
      }}
      contentClassName="page-container"
    >
      <Outlet />
    </AppShell>
  )
}
