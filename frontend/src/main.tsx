import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorFallback } from '@/components/shared/ErrorFallback/ErrorFallback'

interface EBState { error: Error | null }

class RootErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary:root]', error)
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

interface RootContainer extends HTMLElement {
  _reactRootContainer?: ReturnType<typeof createRoot>
}

const container = document.getElementById('root')! as RootContainer
const root = container._reactRootContainer ?? createRoot(container)
container._reactRootContainer = root

root.render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
