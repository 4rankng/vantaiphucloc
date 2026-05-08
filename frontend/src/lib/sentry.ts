import * as Sentry from '@sentry/react'

let initialised = false

export function initSentry(): void {
  if (initialised) return
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  })
  initialised = true
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialised) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}
