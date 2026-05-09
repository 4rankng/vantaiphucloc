import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { DesktopTopNav } from '@/components/shared/DesktopTopNav'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['director', 'superadmin']

function DirectorShell() {
  return (
    <div className="flex h-[100dvh] flex-col" style={{ background: 'var(--theme-bg-primary)' }}>
      {/* Minimal header — logo + brand label + user controls only, no nav tabs */}
      <DesktopTopNav
        brandLabel="Giám đốc"
        items={[]}
        rootPath="/director"
        profilePath="/director/profile"
        notificationsPath="/director/notifications"
      />

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="page-container">
          <Outlet />
        </div>
      </main>
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
