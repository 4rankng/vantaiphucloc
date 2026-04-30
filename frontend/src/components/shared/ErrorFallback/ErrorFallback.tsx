import { AlertCircle, RefreshCw, Home, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-utils'
import { useState } from 'react'

type Variant = 'network' | 'runtime' | 'permission' | 'not-found'

const TITLES: Record<Variant, string> = {
  network: 'Không thể kết nối',
  runtime: 'Đã xảy ra lỗi',
  permission: 'Không có quyền truy cập',
  'not-found': 'Không tìm thấy',
}

interface Props {
  variant?: Variant
  error?: Error
  component?: string
  onRetry?: () => void
  onHome?: () => void
  className?: string
}

export function ErrorFallback({ variant = 'runtime', error, component, onRetry, onHome, className }: Props) {
  const message = error ? getErrorMessage(error) : undefined
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = [
      `Component: ${component || 'Unknown'}`,
      `Variant: ${variant}`,
      `Error: ${error?.name}: ${error?.message}`,
      error?.stack,
    ].filter(Boolean).join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers that block clipboard API
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={cn('flex min-h-[400px] items-center justify-center p-4', className)}>
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] p-6 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--theme-text-primary)]">{TITLES[variant]}</h2>
          <p className="mt-2 text-sm text-[var(--theme-text-muted)]">
            {component && <span className="block mb-1 font-medium">{component}</span>}
            {message || 'Vui lòng thử lại hoặc quay về trang chủ'}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" /> Thử lại
              </Button>
            )}
            {onHome && (
              <Button onClick={onHome} variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" /> Về trang chủ
              </Button>
            )}
            <button onClick={handleCopy} className="text-xs text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] flex items-center justify-center gap-1.5 mx-auto transition-colors">
              {copied
                ? <><Check className="h-3.5 w-3.5 text-green-500" /> <span className="text-green-500">Đã sao chép</span></>
                : <><Copy className="h-3.5 w-3.5" /> Sao chép chi tiết lỗi</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
