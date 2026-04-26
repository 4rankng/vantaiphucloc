import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppStoreProvider, useAppStore } from '@/hooks/use-app-store'
import { AppTopBar } from '@/components/shared/AppTopBar'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { AccountantDashboard } from './AccountantDashboard'
import { ClientList } from './ClientList'
import { RouteList } from './RouteList'
import { PricingList } from './PricingList'
import { WorkOrderList } from './WorkOrderList'
import { SalaryView } from './SalaryView'

const HOME_PATH = '/accountant'

const TITLES: Record<string, string> = {
  '/accountant/clients': 'Khách hàng',
  '/accountant/routes': 'Cung đường',
  '/accountant/pricings': 'Bảng giá',
  '/accountant/work-orders': 'Số công',
  '/accountant/salary': 'Tính lương',
}

function getPageTitle(path: string): string {
  return TITLES[path] ?? ''
}

function AccountantRouter() {
  const { user } = useAuth()
  const { currentPath, navigate, goBack } = useAppStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [currentPath])

  const isHome = currentPath === HOME_PATH

  const renderPage = () => {
    switch (currentPath) {
      case '/accountant':              return <AccountantDashboard />
      case '/accountant/clients':      return <ClientList />
      case '/accountant/routes':       return <RouteList />
      case '/accountant/pricings':     return <PricingList />
      case '/accountant/work-orders':  return <WorkOrderList />
      case '/accountant/salary':       return <SalaryView />
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
        <AppTopBar variant="page" title={getPageTitle(currentPath)} onBack={goBack} />
      )}

      <main className={isHome ? undefined : 'p-4 space-y-4'}>
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
