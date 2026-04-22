import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

class ErrorBoundary extends (await import('react')).Component {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
          <h3 style={{ color: 'red' }}>Lỗi tải ứng dụng</h3>
          <pre style={{ fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
          <button onClick={() => location.reload()} style={{ marginTop: 10, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#00963E', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Tải lại</button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
