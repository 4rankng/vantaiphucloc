import { ThemeProvider } from '@/themes'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ErrorBoundaryProvider } from '@/contexts/ErrorContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { ToastProvider } from '@/components/atoms/Toast'
import { Login } from '@/pages/Login'
import { DriverStoreProvider, useDriverStore } from '@/hooks/use-driver-store'
import { TopBar, BottomNav, PageLayout, HomeLayout } from '@/pages/driver/AppShell'
import { TripList } from '@/pages/driver/TripList'
import { ActiveTrip } from '@/pages/driver/ActiveTrip'
import { TripDetail } from '@/pages/driver/TripDetail'
import { ExpenseList } from '@/pages/driver/ExpenseList'
import { CreateExpense } from '@/pages/driver/CreateExpense'
import { EarningsOverview } from '@/pages/driver/EarningsOverview'
import { DriverHome } from '@/pages/driver/DriverHome'
import { Notifications } from '@/pages/driver/Notifications'
import { Profile } from '@/pages/driver/Profile'

function Router() {
  const { currentPath } = useDriverStore()

  const detailMatch = currentPath.match(/^\/driver\/trips\/([^/]+)\/detail$/)
  if (detailMatch) return <PageLayout showBack><TripDetail jobId={detailMatch[1]} /></PageLayout>

  const tripMatch = currentPath.match(/^\/driver\/trips\/([^/]+)$/)
  if (tripMatch) return <PageLayout showBack><ActiveTrip jobId={tripMatch[1]} /></PageLayout>

  switch (currentPath) {
    case '/driver/trips': return <PageLayout showBack><TripList /></PageLayout>
    case '/driver/expenses': return <PageLayout showBack><ExpenseList /></PageLayout>
    case '/driver/expenses/new': return <PageLayout showBack><CreateExpense /></PageLayout>
    case '/driver/earnings': return <PageLayout showBack><EarningsOverview /></PageLayout>
    case '/driver/notifications': return <PageLayout showBack><Notifications /></PageLayout>
    case '/driver/profile': return <PageLayout showBack><Profile /></PageLayout>
    default: return <HomeLayout><DriverHome /></HomeLayout>
  }
}

function DriverApp() {
  return (
    <DriverStoreProvider>
      <Router />
    </DriverStoreProvider>
  )
}

function AppContent() {
  const { user } = useAuth()

  return (
    <ErrorBoundary component="App" level="app">
      {!user ? <Login /> : <DriverApp />}
      <OfflineIndicator />
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundaryProvider>
          <OfflineProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </OfflineProvider>
        </ErrorBoundaryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
