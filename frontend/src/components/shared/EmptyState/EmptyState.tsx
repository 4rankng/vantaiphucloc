import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--theme-bg-tertiary)] mb-4">
        <span className="text-[var(--theme-text-muted)]">{icon}</span>
      </div>
      <p className="text-sm font-semibold text-[var(--theme-text-primary)]">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-[var(--theme-text-muted)] max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
