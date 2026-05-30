import { useState } from 'react'
import { XCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-utils'

interface Props {
  error: Error
  component: string
  onRetry: () => void
  className?: string
}

export function InlineError({ error, component, onRetry, className }: Props) {
  const [expanded, setExpanded] = useState(false)
  const message = getErrorMessage(error)

  return (
    <div
      className={cn('rounded-xl p-4', className)}
      style={{
        background: 'var(--theme-status-error-light)',
        borderLeft: '3px solid var(--theme-status-error)',
      }}
    >
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--theme-status-error)' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{component}</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{message}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 rounded-lg touch-manipulation"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold touch-manipulation"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Thử lại
              </button>
            </div>
          </div>
          {expanded && (
            <div
              className="mt-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap p-2 rounded-lg"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
            >
              {error.name}: {error.message}
              {error.stack && `\n\n${error.stack}`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
