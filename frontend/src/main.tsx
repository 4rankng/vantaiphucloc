import { Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorFallback } from '@/components/shared/feedback/ErrorFallback/ErrorFallback'
import { initSentry, captureException } from '@/lib/sentry'

initSentry()

interface EBState { error: Error | null }

class RootErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary:root]', error)
    captureException(error, info?.componentStack ? { componentStack: info.componentStack } : undefined)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <ErrorFallback
        error={this.state.error}
        onRetry={() => this.setState({ error: null })}
      />
    )
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
)

// PWA: register service worker in production for Android installability + offline app shell.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((error) => {
      console.warn('[sw] registration failed', error)
    })
  })
}
