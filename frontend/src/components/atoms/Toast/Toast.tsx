import { useState, useCallback, useMemo, createContext, useContext, type ReactNode } from 'react'
import {
  ToastProvider as RadixToastProvider,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastViewport,
} from '@/components/ui/Toast'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'

type ToastVariant = 'default' | 'success' | 'warning' | 'error'

interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_ICONS: Record<ToastVariant, typeof Info> = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
}

let toastCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((opts: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = `toast-${++toastCounter}`
    setToasts(prev => [...prev, { id, title: opts.title, description: opts.description, variant: opts.variant ?? 'default' }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const value: ToastContextValue = useMemo(() => ({
    toast: addToast,
    success: (title, description) => addToast({ title, description, variant: 'success' }),
    error: (title, description) => addToast({ title, description, variant: 'error' }),
    info: (title, description) => addToast({ title, description, variant: 'default' }),
  }), [addToast])

  return (
    <ToastContext.Provider value={value}>
      <RadixToastProvider swipeDirection="right">
        {children}
        {toasts.map(t => {
          const Icon = VARIANT_ICONS[t.variant]
          return (
            <Toast key={t.id} variant={t.variant}>
              <Icon className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <ToastTitle>{t.title}</ToastTitle>
                {t.description && <ToastDescription>{t.description}</ToastDescription>}
              </div>
              <ToastClose className="shrink-0">
                <X className="h-4 w-4" />
              </ToastClose>
            </Toast>
          )
        })}
        <ToastViewport />
      </RadixToastProvider>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// Convenience component for adding Toaster to app root.
// The actual viewport is rendered inside ToastProvider — this is a no-op kept
// for API compatibility with existing imports.
export function Toaster() {
  return null
}
