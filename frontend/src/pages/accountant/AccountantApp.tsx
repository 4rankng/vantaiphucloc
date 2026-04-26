import { useEffect } from 'react'
import { LayoutDashboard, Camera, Bell, UserCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AppStoreProvider, useAppStore } from '@/hooks/use-app-store'
import { BackButton } from '@/components/shared/BackButton'
import { getPageTitle } from '@/lib/navigation'
import { AccountantDashboard } from './AccountantDashboard'
import { ClientList } from './ClientList'
import { RouteList } from './RouteList'
import { PricingList } from './PricingList'
import { WorkOrderList } from './WorkOrderList'
import { TripOrderList } from './TripOrderList'
import { SalaryView } from './SalaryView'
import { AccountantNotifications } from './AccountantNotifications'
import { AccountantProfile } from './AccountantProfile'

// Bottom nav tabs (Grab-style)
type BottomTab = 'home' | 'work-orders' | 'notifications' | 'account'

const bottomNavItems: { tab: BottomTab; icon: typeof LayoutDashboard; label: string }[] = [
  { tab: 'home', icon: LayoutDashboard, label: 'Trang chủ' },
  { tab: 'work-orders', icon: Camera, label: 'Số công' },
  { tab: 'notifications', icon: Bell, label: 'Thông báo' },
  { tab: 'account', icon: UserCircle, label: 'Tài khoản' },
]

function TopBar() {
  const { user } = useAuth()
  const { currentPath } = useAppStore()
  const title = getPageTitle(currentPath)

  return (
    <div className="px-4 pt-3 pb-2" style={{ background: 'var(--theme-brand-primary)' }}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] truncate" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.75 }}>{title}</p>
          <p className="text-[15px] font-bold truncate" style={{ color: 'var(--theme-text-on-brand)' }}>{user?.name}</p>
        </div>
      </div>
    </div>
  )
}

function BottomNav({ activeTab, onTabChange }: { activeTab: BottomTab; onTabChange: (t: BottomTab) => void }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2"
      style={{
        background: 'var(--theme-bottom-nav)',
        borderTop: '1px solid var(--theme-bottom-nav-border)',
        height: '3.5rem',
      }}
    >
      {bottomNavItems.map(({ tab, icon: Icon, label }) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full touch-manipulation"
          aria-label={label}
        >
          <Icon
            className="w-5 h-5"
            style={{ color: activeTab === tab ? 'var(--theme-bottom-nav-active)' : 'var(--theme-bottom-nav-inactive)' }}
          />
          <span
            className="text-[10px] font-medium"
            style={{ color: activeTab === tab ? 'var(--theme-bottom-nav-active)' : 'var(--theme-bottom-nav-inactive)' }}
          >
            {label}
          </span>
        </button>
      ))}
    </nav>
  )
}

function AccountantHomeLayout({ children, activeTab, onTabChange }: {
  children: React.ReactNode
  activeTab: BottomTab
  onTabChange: (t: BottomTab) => void
}) {
  return (
    <div className="min-h-[100dvh] pb-14" style={{ background: 'var(--theme-bg-primary)' }}>
      <TopBar />
      <main>{children}</main>
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  )
}

function AccountantPageLayout({ children, activeTab, onTabChange }: {
  children: React.ReactNode
  activeTab: BottomTab
  onTabChange: (t: BottomTab) => void
}) {
  const { goBack } = useAppStore()
  return (
    <div className="min-h-[100dvh] pb-14" style={{ background: 'var(--theme-bg-primary)' }}>
      <TopBar />
      <main className="p-4 space-y-4">
        <BackButton onClick={goBack} />
        {children}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  )
}

function AccountantRouter() {
  const { currentPath, navigate } = useAppStore()

  // Determine active bottom tab
  const getActiveTab = (): BottomTab => {
    if (currentPath === '/accountant' || currentPath.startsWith('/accountant/clients') || currentPath.startsWith('/accountant/routes') || currentPath.startsWith('/accountant/pricings') || currentPath.startsWith('/accountant/trip-orders') || currentPath.startsWith('/accountant/salary')) return 'home'
    if (currentPath.startsWith('/accountant/work-orders')) return 'work-orders'
    if (currentPath.startsWith('/accountant/notifications')) return 'notifications'
    if (currentPath.startsWith('/accountant/profile')) return 'account'
    return 'home'
  }

  const handleTabChange = (tab: BottomTab) => {
    switch (tab) {
      case 'home': navigate('/accountant'); break
      case 'work-orders': navigate('/accountant/work-orders'); break
      case 'notifications': navigate('/accountant/notifications'); break
      case 'account': navigate('/accountant/profile'); break
    }
  }

  const activeTab = getActiveTab()

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [currentPath])

  // Home-level pages (no back button)
  const homeLevelPaths = ['/accountant', '/accountant/work-orders', '/accountant/notifications', '/accountant/profile']

  if (homeLevelPaths.includes(currentPath)) {
    const renderHome = () => {
      switch (currentPath) {
        case '/accountant': return <AccountantDashboard />
        case '/accountant/work-orders': return <WorkOrderList />
        case '/accountant/notifications': return <AccountantNotifications />
        case '/accountant/profile': return <AccountantProfile />
        default: return <AccountantDashboard />
      }
    }
    return (
      <AccountantHomeLayout activeTab={activeTab} onTabChange={handleTabChange}>
        {renderHome()}
      </AccountantHomeLayout>
    )
  }

  const renderPage = () => {
    switch (currentPath) {
      case '/accountant/clients': return <ClientList />
      case '/accountant/routes': return <RouteList />
      case '/accountant/pricings': return <PricingList />
      case '/accountant/trip-orders': return <TripOrderList />
      case '/accountant/salary': return <SalaryView />
      default: return (
        <div className="text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>
          <p className="text-sm">Trang đang phát triển</p>
        </div>
      )
    }
  }

  return (
    <AccountantPageLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {renderPage()}
    </AccountantPageLayout>
  )
}

export function AccountantApp() {
  return (
    <AppStoreProvider initialPath="/accountant">
      <AccountantRouter />
    </AppStoreProvider>
  )
}
