import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface StatCardProps {
  /** Label/title for the stat */
  label: string
  /** The main value to display */
  value: string | number
  /** Optional icon to display */
  icon?: ReactNode
  /** Color override for the value */
  valueColor?: string
  /** Trend percentage (positive = up, negative = down, 0 = neutral) */
  trend?: number
  /** Label for trend comparison (e.g., "vs last month") */
  trendLabel?: string
  /** Click handler - makes card interactive */
  onClick?: () => void
  /** Loading state */
  loading?: boolean
  /** Optional subtitle below value */
  subtitle?: string
}

export interface StatsGridProps {
  /** Array of stat card data */
  stats: StatCardProps[]
  /** Number of columns on desktop (default: auto based on count) */
  columns?: 2 | 3 | 4 | 5
  /** Gap size between cards */
  gap?: 'sm' | 'md' | 'lg'
  /** Card style variant */
  variant?: 'default' | 'outline' | 'filled'
}

function StatCardSkeleton() {
  return (
    <div
      className="rounded-2xl border p-4 lg:p-5"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
      }}
    >
      <div className="skeleton-shimmer h-4 w-20 rounded mb-2" />
      <div className="skeleton-shimmer h-8 w-32 rounded mb-1" />
      <div className="skeleton-shimmer h-3 w-16 rounded" />
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  valueColor,
  trend,
  trendLabel,
  onClick,
  loading,
  subtitle,
}: StatCardProps) {
  if (loading) {
    return <StatCardSkeleton />
  }

  const isClickable = !!onClick
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus

  const trendColor =
    trend && trend > 0
      ? 'var(--theme-status-success)'
      : trend && trend < 0
        ? 'var(--theme-status-error)'
        : 'var(--theme-text-muted)'

  const Component = isClickable ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={`rounded-2xl border p-4 lg:p-5 text-left transition-all ${
        isClickable
          ? 'cursor-pointer hover:border-[color-mix(in_srgb,var(--theme-brand-primary)_30%,transparent)] hover:shadow-md active:scale-[0.98]'
          : ''
      }`}
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Label */}
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            {label}
          </p>

          {/* Value */}
          <p
            className="text-2xl lg:text-3xl font-bold font-display tabular-nums leading-tight truncate"
            style={{ color: valueColor ?? 'var(--theme-text-primary)' }}
          >
            {value}
          </p>

          {/* Subtitle */}
          {subtitle && (
            <p className="mt-0.5 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              {subtitle}
            </p>
          )}

          {/* Trend */}
          {typeof trend === 'number' && (
            <div className="flex items-center gap-1.5 mt-2">
              <div
                className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold"
                style={{
                  background: `color-mix(in srgb, ${trendColor} 12%, transparent)`,
                  color: trendColor,
                }}
              >
                <TrendIcon className="h-3 w-3" />
                <span>{Math.abs(trend)}%</span>
              </div>
              {trendLabel && (
                <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)',
              color: 'var(--theme-brand-primary)',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Component>
  )
}

export function StatsGrid({ stats, columns, gap = 'md' }: StatsGridProps) {
  // Auto-determine columns based on stat count if not specified
  const cols = columns ?? (stats.length <= 2 ? 2 : stats.length <= 3 ? 3 : 4)

  const gapClass = gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-4' : 'gap-3'

  const gridColsClass =
    cols === 2
      ? 'grid-cols-2'
      : cols === 3
        ? 'grid-cols-2 lg:grid-cols-3'
        : cols === 5
          ? 'grid-cols-2 lg:grid-cols-5'
          : 'grid-cols-2 lg:grid-cols-4'

  return (
    <div className={`grid ${gridColsClass} ${gapClass}`}>
      {stats.map((stat, idx) => (
        <StatCard key={idx} {...stat} />
      ))}
    </div>
  )
}

export { StatCard }
