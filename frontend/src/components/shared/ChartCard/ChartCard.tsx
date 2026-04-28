'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  loading?: boolean
  className?: string
}

export function ChartCard({ title, subtitle, actions, children, loading, className }: ChartCardProps) {
  return (
    <div
      className={cn('rounded-2xl p-4', className)}
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{title}</p>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{subtitle}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {loading ? (
        <div className="flex h-[180px] items-center justify-center">
          <div className="h-3 w-24 animate-pulse rounded" style={{ background: 'var(--theme-bg-tertiary)' }} />
        </div>
      ) : (
        children
      )}
    </div>
  )
}
