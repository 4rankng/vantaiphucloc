import { useState } from 'react'
import { XCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
    <div className={cn(
      'rounded-lg border-l-[3px] border-red-500 bg-red-50 p-4 dark:bg-red-950/20',
      className
    )}>
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-900 dark:text-red-100">{component}</p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{message}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 dark:text-red-400 rounded-md"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Thử lại
              </Button>
            </div>
          </div>
          {expanded && (
            <div className="mt-3 text-xs text-red-600 dark:text-red-400 font-mono overflow-x-auto whitespace-pre-wrap">
              {error.name}: {error.message}
              {error.stack && `\n\n${error.stack}`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
