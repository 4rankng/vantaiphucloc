import { Navigate, Outlet, useState } from 'react-router-dom'
import { DirectorSidebar } from '@/components/shared/DirectorSidebar'
import { NotificationPanel } from '@/components/shared/NotificationPanel/NotificationPanel'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['director', 'superadmin']

function DirectorShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden" style={{ background: 'var(--theme-bg-primary)' }}>
      <DirectorSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        onNotificationsOpen={() => setNotifOpen(true)}
      />
      <main className="flex-1 overflow-y-auto min-w-0 bg-dot-grid">
        <div className="page-container">
          <Outlet />
        </div>
      </main>
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}

export function DirectorLayout() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <DirectorShell />
}
