'use client'

import type { ReactNode } from 'react'
import { TrendUp, TrendDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type TrendDirection = 'up' | 'down' | 'flat'

interface MetricCardProps {
  /** Primary value — the hero number */
  value: string | number
  /** Label above the value */
  label: string
  /** Subtitle below value */
  subtitle?: string
  /** Trend indicator */
  trend?: {
    direction: TrendDirection
    value: string // e.g. "+12%"
    label?: string // e.g. "vs last month"
  }
  /** Icon component */
  icon?: ReactNode
  /** Variant styling */
  variant?: 'default' | 'success' | 'warning' | 'danger'
  /** Click handler */
  onClick?: () => void
  className?: string
}

const TREND_ICONS: Record<TrendDirection, typeof TrendUp> = {
  up: TrendUp,
  down: TrendDown,
  flat: Minus,
}

const TRENT_COLORS: Record<TrendDirection, string> = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-red-600 dark:text-red-400',
  flat: 'text-[var(--theme-text-muted)]',
}

const VARIANT_BORDERS: Record<string, string> = {
  default: '',
  success: 'border-l-[3px] border-l-emerald-500',
  warning: 'border-l-[3px] border-l-amber-500',
  danger: 'border-l-[3px] border-l-red-500',
}

export function MetricCard({
  value,
  label,
  subtitle,
  trend,
  icon,
  variant = 'default',
  onClick,
  className,
}: MetricCardProps) {
  const TrendIcon = trend ? TREND_ICONS[trend.direction] : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border border-[var(--theme-border-default)]',
        'bg-[var(--theme-bg-secondary)] p-5 shadow-sm',
        'transition-shadow duration-150',
        (onClick) && 'cursor-pointer hover:shadow-md active:scale-[0.99]',
        VARIANT_BORDERS[variant],
        className,
      )}
    >
      {/* Header: label + icon */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">
          {label}
        </p>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--theme-bg-tertiary)]">
            {icon}
          </div>
        )}
      </div>

      {/* Hero value */}
      <p className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-[var(--theme-text-primary)]">
        {value}
      </p>

      {/* Subtitle + trend */}
      <div className="mt-1.5 flex items-center gap-2">
        {trend && TrendIcon && (
          <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', TRENT_COLORS[trend.direction])}>
            <TrendIcon className="h-3.5 w-3.5" />
            {trend.value}
          </span>
        )}
        {subtitle && (
          <span className="text-[11px] text-[var(--theme-text-muted)]">
            {subtitle}
          </span>
        )}
      </div>
    </button>
  )
}
