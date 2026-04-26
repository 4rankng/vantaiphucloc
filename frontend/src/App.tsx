import { ThemeProvider } from '@/themes'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ErrorBoundaryProvider } from '@/contexts/ErrorContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { ToastProvider } from '@/components/atoms/Toast'
import { RoleSelect } from '@/pages/RoleSelect'
import { DriverStoreProvider, useDriverStore } from '@/hooks/use-driver-store'
import { TopBar, PageLayout, HomeLayout } from '@/pages/driver/AppShell'
import { CreateWorkOrder } from '@/pages/driver/CreateWorkOrder'
import { DriverHome } from '@/pages/driver/DriverHome'
import { Profile } from '@/pages/driver/Profile'
import { DirectorApp } from '@/pages/director/DirectorApp'
import { AccountantApp } from '@/pages/accountant/AccountantApp'

function DriverRouter() {
  const { currentPath } = useDriverStore()

  switch (currentPath) {
    case '/driver/work-orders/new': return <PageLayout showBack><CreateWorkOrder /></PageLayout>
    case '/driver/profile': return <PageLayout showBack><Profile /></PageLayout>
    default: return <HomeLayout><DriverHome /></HomeLayout>
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
