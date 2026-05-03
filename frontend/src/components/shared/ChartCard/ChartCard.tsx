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
      className={cn('rounded-lg p-5', className)}
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-sm)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{title}</p>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{subtitle}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {loading ? (
        <div className="flex h-[200px] items-center justify-center">
          <div className="space-y-2">
            <div className="h-3 w-32 animate-pulse rounded-full" style={{ background: 'var(--theme-bg-tertiary)' }} />
            <div className="h-3 w-24 animate-pulse rounded-full mx-auto" style={{ background: 'var(--theme-bg-tertiary)' }} />
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  )
}
