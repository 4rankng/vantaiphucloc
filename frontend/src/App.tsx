import { useMemo } from 'react'
import { ThemeProvider } from '@/themes'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundaryProvider } from '@/contexts/ErrorContext'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
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
            <ToastProvider>
              <ErrorBoundary component="App" level="app">
                <RouterProvider router={router} />
              </ErrorBoundary>
            </ToastProvider>
          </ErrorBoundaryProvider>
        </QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
