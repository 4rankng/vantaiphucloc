import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppStoreProvider, useAppStore } from '@/hooks/use-app-store'
import { AppTopBar } from '@/components/shared/AppTopBar'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { AccountantDashboard } from './AccountantDashboard'
import { ClientList } from './ClientList'
import { RouteList } from './RouteList'
import { WorkOrderList } from './WorkOrderList'
import { TripList } from './TripList'
import { TripDetail } from './TripDetail'
import { CreateTrip } from './CreateTrip'
import { SalarySetup } from './SalarySetup'
import { MatchJob } from './MatchJob'
import { PricingList } from './PricingList'

const TITLES: Record<string, string> = {
  '/accountant/clients': 'Khách hàng',
  '/accountant/routes': 'Cung đường',
  '/accountant/work-orders': 'Đối soát tài xế',
  '/accountant/trips': 'Chuyến',
  '/accountant/salary-setup': 'Thiết lập kỳ lương',
  '/accountant/pricing': 'Bảng giá',
}

function AccountantRouter() {
  const { user } = useAuth()
  const { currentPath, navigate, goBack } = useAppStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' as ScrollBehavior }) }, [currentPath])

  const isHome = currentPath === '/accountant'
  const title = TITLES[currentPath] ?? (
    currentPath.startsWith('/accountant/trip/') ? 'Chi tiết chuyến' :
    currentPath.startsWith('/accountant/match/') ? 'Đối soát' : ''
  )

  const renderPage = () => {
    if (currentPath.startsWith('/accountant/trip/')) {
      const tripId = currentPath.replace('/accountant/trip/', '')
      return <TripDetail tripId={tripId} />
    }
    if (currentPath.startsWith('/accountant/match/')) {
      const jobId = currentPath.replace('/accountant/match/', '')
      return <MatchJob jobId={jobId} />
    }
    switch (currentPath) {
      case '/accountant':              return <AccountantDashboard />
      case '/accountant/clients':      return <ClientList />
      case '/accountant/routes':       return <RouteList />
      case '/accountant/work-orders':  return <WorkOrderList />
      case '/accountant/trips':        return <TripList />
      case '/accountant/create-trip':  return <CreateTrip />
      case '/accountant/salary-setup': return <SalarySetup />
      case '/accountant/pricing':      return <PricingList />
      default: return (
        <div className="p-4 text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>
          <p className="text-sm">Trang đang phát triển</p>
        </div>
      )
    }
  }

  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      {isHome ? (
        <AppTopBar
          variant="home"
          name={user?.name ?? ''}
          onNotifications={() => {}}
          onProfile={() => setDropdownOpen(true)}
        />
      ) : (
        <AppTopBar variant="page" title={title} onBack={goBack} />
      )}

      <main className={isHome || currentPath.startsWith('/accountant/match/') ? undefined : 'p-4 space-y-4'}>
        {renderPage()}
      </main>
      <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
    </div>
  )
}

export function AccountantApp() {
  return (
    <AppStoreProvider initialPath="/accountant">
      <AccountantRouter />
    </AppStoreProvider>
  )
}
