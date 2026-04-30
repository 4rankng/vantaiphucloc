import { useMemo } from 'react'
import { ThemeProvider } from '@/themes'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundaryProvider } from '@/contexts/ErrorContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { ToastProvider } from '@/components/atoms/Toast'
import { RouterProvider } from 'react-router-dom'
import { QueryProvider } from '@/contexts/QueryContext'
import { createAppRouter } from './router'

export default function App() {
  // Create router once — must be inside a component, not at module level,
  // so that React Fast Refresh works correctly in router.tsx.
  const router = useMemo(() => createAppRouter(), [])

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryProvider>
          <ErrorBoundaryProvider>
            <OfflineProvider>
              <ToastProvider>
                <ErrorBoundary component="App" level="app">
                  <RouterProvider router={router} />
                  <OfflineIndicator />
                </ErrorBoundary>
              </ToastProvider>
            </OfflineProvider>
          </ErrorBoundaryProvider>
        </QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
