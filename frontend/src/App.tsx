import { ThemeProvider } from '@/themes'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ErrorBoundaryProvider } from '@/contexts/ErrorContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { ToastProvider } from '@/components/atoms/Toast'
import { RoleSelect } from '@/pages/RoleSelect'
import { DriverStoreProvider, useDriverStore } from '@/hooks/use-driver-store'
import { PageLayout, HomeLayout } from '@/pages/driver/AppShell'
import { CreateWorkOrder } from '@/pages/driver/CreateWorkOrder'
import { DriverHome } from '@/pages/driver/DriverHome'
import { JobDetail } from '@/pages/driver/JobDetail'
import { DriverHistory } from '@/pages/driver/DriverHistory'
import { DriverNotifications } from '@/pages/driver/DriverNotifications'
import { Profile } from '@/pages/driver/Profile'
import { DirectorApp } from '@/pages/director/DirectorApp'
import { AccountantApp } from '@/pages/accountant/AccountantApp'

function DriverRouter() {
  const { currentPath } = useDriverStore()

  switch (currentPath) {
    case '/driver/work-orders/new': return <ErrorBoundary component="CreateWorkOrder" level="page"><PageLayout showBack title="Tạo chuyến"><CreateWorkOrder /></PageLayout></ErrorBoundary>
    case '/driver/history':         return <ErrorBoundary component="DriverHistory" level="page"><PageLayout showBack title="Lịch sử"><DriverHistory /></PageLayout></ErrorBoundary>
    case '/driver/notifications':   return <ErrorBoundary component="Notifications" level="page"><PageLayout showBack title="Thông báo"><DriverNotifications /></PageLayout></ErrorBoundary>
    case '/driver/profile':         return <ErrorBoundary component="Profile" level="page"><PageLayout showBack title="Tài khoản"><Profile /></PageLayout></ErrorBoundary>
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

  if (!user) return <RoleSelect />

  switch (user.role) {
    case 'director': return <DirectorApp />
    case 'accountant': return <AccountantApp />
    default: return <DriverApp />
  }
}

export default function App() {
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
