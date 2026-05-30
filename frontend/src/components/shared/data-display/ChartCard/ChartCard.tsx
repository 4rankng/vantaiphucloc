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

// Bar heights for the skeleton — intentionally irregular so it reads as real chart data
const SKELETON_BARS = [55, 80, 40, 95, 65, 75, 50, 85, 45, 70, 90, 60]

export function ChartCard({ title, subtitle, actions, children, loading, className }: ChartCardProps) {
  return (
    <div
      className={cn('rounded-xl p-5', className)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          {/* typo-h1: 17px / 700 / display font */}
          <p
            className="typo-h1 truncate"
            style={{ letterSpacing: '-0.02em' }}
          >
            {title}
          </p>
          {subtitle && (
            <p className="typo-meta mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {loading ? (
        /* Bar-chart shaped skeleton — irregular heights feel like real data */
        <div className="flex h-[200px] flex-col justify-end gap-0">
          <div className="flex items-end gap-[5px] px-1 h-[160px]">
            {SKELETON_BARS.map((h, i) => (
              <div
                key={i}
                className="skeleton-shimmer flex-1 rounded-t-sm"
                style={{
                  height: `${h}%`,
                  animationDelay: `${i * 0.06}s`,
                }}
              />
            ))}
          </div>
          {/* X-axis baseline */}
          <div
            className="skeleton-shimmer rounded mt-2 mx-1"
            style={{ height: 1 }}
          />
          {/* X-axis labels row */}
          <div className="flex gap-[5px] px-1 mt-2">
            {SKELETON_BARS.filter((_, i) => i % 3 === 0).map((_, i) => (
              <div
                key={i}
                className="skeleton-shimmer flex-1 rounded"
                style={{ height: 8, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  )
}
