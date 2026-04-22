import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface EBState { error: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--theme-bg-primary, #F7F7F7)',
        padding: '24px',
      }}>
        <div style={{
          maxWidth: 360,
          width: '100%',
          textAlign: 'center',
        }}>
          {/* Icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            background: 'var(--theme-status-error-light, #FFECEC)',
          }}>
            <AlertTriangle width={28} height={28} style={{ color: 'var(--theme-status-error, #FF5252)' }} />
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: 18, fontWeight: 700, marginBottom: 8,
            color: 'var(--theme-text-primary, #1C1C1C)',
            fontFamily: 'var(--theme-font-body, sans-serif)',
          }}>
            Đã có lỗi xảy ra
          </h2>

          {/* Message */}
          <p style={{
            fontSize: 13, lineHeight: 1.5, marginBottom: 6,
            color: 'var(--theme-text-secondary, #6B6B6B)',
            fontFamily: 'var(--theme-font-body, sans-serif)',
          }}>
            Ứng dụng gặp sự cố không mong muốn.
          </p>

          {/* Error detail */}
          <div style={{
            background: 'var(--theme-bg-tertiary, #EEE)',
            borderRadius: 12, padding: '10px 14px',
            marginBottom: 20, textAlign: 'left',
          }}>
            <code style={{
              fontSize: 11, fontFamily: 'var(--theme-font-mono, monospace)',
              color: 'var(--theme-status-error, #FF5252)',
              wordBreak: 'break-word', whiteSpace: 'pre-wrap',
            }}>
              {this.state.error.message}
            </code>
          </div>

          {/* Reload button */}
          <button
            onClick={() => location.reload()}
            style={{
              width: '100%', height: 44, borderRadius: 12, border: 'none',
              background: 'var(--theme-brand-primary, #00963E)',
              color: 'var(--theme-text-on-brand, #FFF)',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'var(--theme-font-body, sans-serif)',
            }}
          >
            <RefreshCw width={16} height={16} />
            Tải lại
          </button>
        </div>
      </div>
    )
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
