import { useEffect, useState } from 'react'
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
import { checkVersion, forceUpdate, requestSoftUpdate } from '@/lib/version'



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

/**
 * Checks version once on mount (session start). No polling.
 * Next check happens when user opens a new tab/session.
 */
function VersionChecker({ children }: { children: React.ReactNode }) {
  const [forceUpdating, setForceUpdating] = useState(false)

  useEffect(() => {
    let mounted = true

    const doCheck = async () => {
      const status = await checkVersion()

      if (!mounted) return

      if (status === 'hard-update') {
        setForceUpdating(true)
        await forceUpdate()
      } else if (status === 'soft-update') {
        requestSoftUpdate()
      }
    }

    doCheck()

    return () => { mounted = false }
  }, [])

  // Listen for FORCE_RELOAD from the service worker
  useEffect(() => {
    if (!navigator.serviceWorker) return

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'FORCE_RELOAD') {
        location.reload()
      }
    }

    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  if (forceUpdating) {
    return <ForceUpdateOverlay />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <VersionChecker>
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
        </VersionChecker>
      </AuthProvider>
    </ThemeProvider>
  )
}
