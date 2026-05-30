import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/shared/feedback/Reveal'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  compact?: boolean
  illustration?: boolean
}

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
    <Reveal direction="scale" threshold={0.05}>
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center',
          compact ? 'py-8 px-4' : 'py-16 px-4',
          className,
        )}
      >
        {illustration ? (
          <div className={cn('mb-4 flex items-center justify-center', compact ? 'h-16' : 'h-28')}>
            {icon}
          </div>
        ) : (
          <div
            className={cn(
              'flex items-center justify-center rounded-full mb-4',
              compact ? 'h-10 w-10' : 'h-14 w-14',
            )}
            style={{
              background: 'color-mix(in srgb, var(--accent) 8%, var(--surface-2))',
              color: 'var(--accent)',
              border: '1px solid color-mix(in srgb, var(--accent) 16%, transparent)',
            }}
          >
            {icon}
          </div>
        )}
        <p className="typo-h2" style={{ letterSpacing: '-0.015em' }}>{title}</p>
        {description && (
          <p className="typo-meta mt-1.5 max-w-sm">{description}</p>
        )}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </Reveal>
  )
}

