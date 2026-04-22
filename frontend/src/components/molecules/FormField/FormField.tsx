import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}

export function FormField({ label, error, hint, required, children }: FormFieldProps) {
  return (
    <div>
      <label className="text-xs font-bold mb-2.5 block" style={{ color: 'var(--theme-text-secondary)' }}>
        {label}
        {required && <span style={{ color: 'var(--theme-status-error)' }}> *</span>}
      </label>
      {children}
      {error && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <AlertCircle className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-error)' }} />
          <span className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{error}</span>
        </div>
      )}
      {hint && !error && (
        <span className="text-xs mt-1.5 block" style={{ color: 'var(--theme-text-muted)' }}>{hint}</span>
      )}
    </div>
  )
}
