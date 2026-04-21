import { ThemeProvider } from '@/themes'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundaryProvider } from '@/contexts/ErrorContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { RoleSelect } from '@/pages/RoleSelect'

function AppContent() {
  return (
    <ErrorBoundary component="App" level="app">
      <RoleSelect />
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
            <AppContent />
          </OfflineProvider>
        </ErrorBoundaryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
