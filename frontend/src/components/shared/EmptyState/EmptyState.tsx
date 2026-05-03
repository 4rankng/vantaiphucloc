import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  /** Compact variant for in-card empty states */
  compact?: boolean
  /**
   * When true, the icon is rendered as a free-form illustration (no circular container).
   * Use this when passing an SVG illustration (e.g. <img src="/illustrations/empty-trips.svg">).
   * When false (default), the icon is rendered inside a 40-56px circular bg container —
   * use this for Lucide icons.
   */
  illustration?: boolean
}

/**
 * Modern SaaS empty state — centered icon/illustration + title + description + optional CTA.
 * Use inside a card or as a full-page placeholder.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
  illustration,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-4',
        className,
      )}
    >
      {illustration ? (
        // Illustration mode — free-form, no circular container
        <div className={cn('mb-4 flex items-center justify-center', compact ? 'h-16' : 'h-28')}>
          {icon}
        </div>
      ) : (
        // Icon mode — circular bg container (Lucide icons)
        <div
          className={cn(
            'flex items-center justify-center rounded-full mb-4',
            compact ? 'h-10 w-10' : 'h-14 w-14',
          )}
          style={{
            background: 'var(--theme-bg-tertiary)',
            color: 'var(--theme-text-muted)',
            border: '1px solid var(--theme-border-default)',
          }}
        >
          {icon}
        </div>
      )}
      <p className="typo-h2">{title}</p>
      {description && (
        <p className="typo-body-sm mt-1.5 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
