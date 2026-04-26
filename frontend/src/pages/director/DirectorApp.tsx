import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppTopBar } from '@/components/shared/AppTopBar'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { DirectorDashboard } from './DirectorDashboard'
import { UserManagement } from './UserManagement'
import { DirectorNotifications } from './DirectorNotifications'
import { DriverJobs } from './DriverJobs'
import { ClientJobs } from './ClientJobs'

type DirectorPage = 'dashboard' | 'users' | 'notifications' | 'driver-jobs' | 'client-jobs'

export function DirectorApp() {
  const { user } = useAuth()
  const [page, setPage] = useState<DirectorPage>('dashboard')
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const goBack = () => setPage('dashboard')

  const renderContent = () => {
    switch (page) {
      case 'users':
        return <><AppTopBar variant="page" title="Quản lý tài khoản" onBack={goBack} /><UserManagement /></>
      case 'notifications':
        return <><AppTopBar variant="page" title="Thông báo" onBack={goBack} /><DirectorNotifications /></>
      case 'driver-jobs':
        return <DriverJobs driverId={selectedDriverId} onBack={goBack} />
      case 'client-jobs':
        return <ClientJobs clientId={selectedClientId} onBack={goBack} />
      default:
        return (
          <>
            <AppTopBar
              variant="home"
              name={user?.name ?? ''}
              onNotifications={() => setPage('notifications')}
              onProfile={() => setDropdownOpen(true)}
            />
            <DirectorDashboard
              onManageUsers={() => setPage('users')}
              onViewDriverJobs={(id) => { setSelectedDriverId(id); setPage('driver-jobs') }}
              onViewClientJobs={(id) => { setSelectedClientId(id); setPage('client-jobs') }}
            />
          </>
        )
    }
  }

  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      {renderContent()}
      <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
    </div>
  )
}
