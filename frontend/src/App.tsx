import { ThemeProvider } from '@/themes'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ErrorBoundaryProvider } from '@/contexts/ErrorContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { ForceUpdateOverlay } from '@/components/shared/ForceUpdateOverlay'
import { ToastProvider } from '@/components/atoms/Toast'
import { Login } from '@/pages/Login'
import { DriverStoreProvider, useDriverStore } from '@/hooks/use-driver-store'
import { PageLayout, HomeLayout } from '@/pages/driver/AppShell'
import { CreateWorkOrder } from '@/pages/driver/CreateWorkOrder'
import { DriverHome } from '@/pages/driver/DriverHome'
import { JobDetail } from '@/pages/driver/JobDetail'
import { DriverHistory } from '@/pages/driver/DriverHistory'
import { DriverNotifications } from '@/pages/driver/DriverNotifications'
import { DirectorApp } from '@/pages/director/DirectorApp'
import { AccountantApp } from '@/pages/accountant/AccountantApp'
import { SuperAdminApp } from '@/pages/superadmin/SuperAdminApp'
import { checkVersion, type VersionStatus } from '@/lib/version'
import { useState, useEffect } from 'react'


function DriverRouter() {
  const { currentPath } = useDriverStore()

  switch (currentPath) {
    case '/driver/work-orders/new': return <ErrorBoundary component="CreateWorkOrder" level="page"><PageLayout showBack title="Tạo chuyến"><CreateWorkOrder /></PageLayout></ErrorBoundary>
    case '/driver/history':         return <ErrorBoundary component="DriverHistory" level="page"><PageLayout showBack title="Lịch sử"><DriverHistory /></PageLayout></ErrorBoundary>
    case '/driver/notifications':   return <ErrorBoundary component="Notifications" level="page"><PageLayout showBack title="Thông báo"><DriverNotifications /></PageLayout></ErrorBoundary>
    default:
      if (currentPath.startsWith('/driver/job/')) return <ErrorBoundary component="JobDetail" level="page"><PageLayout showBack title="Chi tiết chuyến"><JobDetail /></PageLayout></ErrorBoundary>
      return <HomeLayout><DriverHome /></HomeLayout>
  }
}

function DriverApp() {
  return (
    <DriverStoreProvider>
      <DriverRouter />
    </DriverStoreProvider>
  )
}

function AppContent() {
  const { user } = useAuth()

  if (!user) return <Login />

  switch (user.role) {
    case 'superadmin': return <SuperAdminApp />
    case 'director': return <DirectorApp />
    case 'accountant': return <AccountantApp />
    default: return <DriverApp />
  }
}

export default function App() {
  const [forceUpdate, setForceUpdate] = useState(false)

  useEffect(() => {
    const doCheck = async () => {
      const status: VersionStatus = await checkVersion()
      if (status === 'hard-update') {
        setForceUpdate(true)
        if ('caches' in window) {
          const names = await caches.keys()
          await Promise.all(names.map(n => caches.delete(n)))
        }
        navigator.serviceWorker?.controller?.postMessage({ type: 'FORCE_UPDATE' })
        setTimeout(() => location.reload(), 1500)
      } else if (status === 'soft-update') {
        navigator.serviceWorker?.controller?.postMessage({ type: 'SKIP_WAITING' })
      }
    }
    doCheck()
    const interval = setInterval(doCheck, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (forceUpdate) {
    return <ForceUpdateOverlay />
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundaryProvider>
          <OfflineProvider>
            <ToastProvider>
              <ErrorBoundary component="App" level="app">
                <AppContent />
                <OfflineIndicator />
              </ErrorBoundary>
            </ToastProvider>
          </OfflineProvider>
        </ErrorBoundaryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
