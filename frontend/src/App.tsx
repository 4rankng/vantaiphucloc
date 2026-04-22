import { ThemeProvider } from '@/themes'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ErrorBoundaryProvider } from '@/contexts/ErrorContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { ToastProvider } from '@/components/atoms/Toast'
import { Login } from '@/pages/Login'
import { DriverStoreProvider, useDriverStore } from '@/hooks/use-driver-store'
import { TopBar, BottomNav, AppShell } from '@/pages/driver/AppShell'
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

  // /driver/trips/:id/detail
  const detailMatch = currentPath.match(/^\/driver\/trips\/([^/]+)\/detail$/)
  if (detailMatch) return <TripDetail jobId={detailMatch[1]} />

  // /driver/trips/:id
  const tripMatch = currentPath.match(/^\/driver\/trips\/([^/]+)$/)
  if (tripMatch) return <ActiveTrip jobId={tripMatch[1]} />

  switch (currentPath) {
    case '/driver/trips': return <TripList />
    case '/driver/expenses': return <ExpenseList />
    case '/driver/expenses/new': return <CreateExpense />
    case '/driver/earnings': return <EarningsOverview />
    case '/driver/notifications': return <Notifications />
    case '/driver/profile': return <Profile />
    default: return <DriverHome />
  }
}

function DriverApp() {
  return (
    <DriverStoreProvider>
      <AppShell>
        <Router />
      </AppShell>
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
