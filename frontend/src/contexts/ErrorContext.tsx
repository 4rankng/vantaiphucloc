/* eslint-disable react-refresh/only-export-components */
'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useCallback, useMemo, useState } from 'react'

interface ErrorState {
  error: Error | null
  component: string | null
  context: Record<string, unknown> | null
}

interface ErrorContextValue {
  captureError: (error: Error, component: string, context?: Record<string, unknown>) => void
  clearError: () => void
  state: ErrorState
}

const ErrorContext = createContext<ErrorContextValue | null>(null)

export function useErrorBoundary() {
  const ctx = useContext(ErrorContext)
  if (!ctx) throw new Error('useErrorBoundary must be used within ErrorBoundaryProvider')
  return ctx
}

export function ErrorBoundaryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ErrorState>({ error: null, component: null, context: null })

  const captureError = useCallback((error: Error, component: string, context?: Record<string, unknown>) => {
    setState({ error, component, context: context || null })
    console.error('[ErrorBoundary]', { error, component, context })
  }, [])

  const clearError = useCallback(() => {
    setState({ error: null, component: null, context: null })
  }, [])

  const value = useMemo(() => ({ captureError, clearError, state }), [captureError, clearError, state])

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  )
}
