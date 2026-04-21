'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  /** Chart title */
  title: string
  /** Optional subtitle */
  subtitle?: string
  /** Time range or filter controls */
  actions?: ReactNode
  /** The recharts chart */
  children: ReactNode
  /** Loading state */
  loading?: boolean
  className?: string
}

export function ChartCard({ title, subtitle, actions, children, loading, className }: ChartCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-[var(--theme-border-default)]',
      'bg-[var(--theme-bg-secondary)] shadow-sm',
      className,
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-0">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--theme-text-primary)]">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--theme-text-muted)]">{subtitle}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {/* Chart area */}
      <div className="px-2 pb-4 pt-3">
        {loading ? (
          <div className="flex h-[200px] items-center justify-center">
            <div className="h-4 w-32 animate-pulse rounded bg-[var(--theme-bg-tertiary)]" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
