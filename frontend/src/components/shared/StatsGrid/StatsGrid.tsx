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
      className="rounded-lg border p-3 lg:p-4"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
      }}
    >
      <div className="skeleton-shimmer h-3 w-16 rounded mb-1.5" />
      <div className="skeleton-shimmer h-5 w-24 rounded mb-1" />
      <div className="skeleton-shimmer h-2.5 w-12 rounded" />
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
      className={`card p-4 text-left transition-all ${
        isClickable
          ? 'cursor-pointer hover:border-[color-mix(in_srgb,var(--theme-brand-primary)_30%,transparent)] active:scale-[0.98]'
          : ''
      }`}
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
        borderRadius: 'var(--theme-radius-lg, 10px)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {/* Label */}
          <p className="typo-label mb-2 leading-tight line-clamp-2">{label}</p>

          {/* Value — using typo-display for lg screens */}
          <p
            className="font-display text-lg lg:text-xl font-700 leading-tight whitespace-nowrap tabular-nums"
            style={{ color: valueColor ?? 'var(--theme-text-primary)' }}
          >
            {value}
          </p>

          {/* Subtitle */}
          {subtitle && (
            <p className="typo-meta mt-1">{subtitle}</p>
          )}

          {/* Trend */}
          {typeof trend === 'number' && (
            <div className="flex items-center gap-1.5 mt-2">
              <div
                className="flex items-center gap-0.5 px-2 py-1 text-xs font-semibold rounded-full"
                style={{
                  background: `color-mix(in srgb, ${trendColor} 12%, transparent)`,
                  color: trendColor,
                }}
              >
                <TrendIcon className="h-3 w-3" />
                <span>{Math.abs(trend)}%</span>
              </div>
              {trendLabel && (
                <span className="typo-meta">{trendLabel}</span>
              )}
            </div>
          )}
        </div>


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
