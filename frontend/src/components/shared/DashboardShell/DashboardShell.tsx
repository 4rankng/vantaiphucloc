'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardShellProps {
  /** Page title */
  title: string
  /** Optional description */
  description?: string
  /** Right side actions (TimeRangePicker, buttons, etc.) */
  actions?: ReactNode
  /** Grid content — MetricCards, ChartCards, DataTables */
  children: ReactNode
  className?: string
}

export function DashboardShell({ title, description, actions, children, className }: DashboardShellProps) {
  return (
    <div className={cn('min-h-screen bg-[var(--theme-bg-primary)]', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 px-5 pt-5 pb-0 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--theme-text-primary)]">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-[var(--theme-text-muted)]">{description}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {/* Content grid */}
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}

/** Metric row — 4 cards on desktop, 2 on tablet, 1 on mobile */
export function MetricRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {children}
    </div>
  )
}

/** Chart row — 2 charts side by side */
export function ChartRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 lg:grid-cols-2', className)}>
      {children}
    </div>
  )
}

/** Section with spacing */
export function DashboardSection({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {children}
    </div>
  )
}
