import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { SparklineChart } from '@/components/shared/SparklineChart'

// ─── Color map for variant tones ────────────────────────────────────────────

const TONE_COLORS = {
  brand: {
    iconBg: 'var(--theme-brand-primary-light, var(--brand-soft))',
    iconColor: 'var(--theme-brand-primary, var(--brand))',
    sparkColor: 'var(--theme-brand-primary, #10B981)',
  },
  success: {
    iconBg: 'var(--theme-status-success-light, var(--success-soft))',
    iconColor: 'var(--theme-status-success, var(--success))',
    sparkColor: '#10B981',
  },
  warning: {
    iconBg: 'var(--theme-status-warning-light, var(--warning-soft))',
    iconColor: 'var(--theme-status-warning, var(--warning))',
    sparkColor: 'var(--theme-text-muted, #A1A1AA)',
  },
  info: {
    iconBg: 'var(--theme-status-info-light, var(--info-soft))',
    iconColor: 'var(--theme-status-info, var(--info))',
    sparkColor: '#2563EB',
  },
} as const

type Tone = keyof typeof TONE_COLORS

// ─── StatCardProps ──────────────────────────────────────────────────────────

export interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  valueColor?: string
  trend?: number
  trendLabel?: string
  tone?: Tone
  sparkData?: number[]
  onClick?: () => void
  loading?: boolean
  subtitle?: string
}

export interface StatsGridProps {
  stats: StatCardProps[]
  columns?: 2 | 3 | 4 | 5
  gap?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'filled'
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div
      className="rounded-lg border p-4 relative overflow-hidden"
      style={{
        background: 'var(--theme-bg-secondary, var(--bg-2))',
        borderColor: 'var(--theme-border-default, var(--border-1))',
      }}
    >
      <div className="skeleton-shimmer h-6 w-6 rounded mb-3" />
      <div className="skeleton-shimmer h-3 w-20 rounded mb-2" />
      <div className="skeleton-shimmer h-6 w-16 rounded" />
    </div>
  )
}

// ─── StatCard ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  valueColor,
  trend,
  trendLabel,
  tone = 'brand',
  sparkData,
  onClick,
  loading,
  subtitle,
}: StatCardProps) {
  if (loading) return <StatCardSkeleton />

  const colors = TONE_COLORS[tone]
  const isClickable = !!onClick
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus

  const trendColor =
    trend && trend > 0
      ? 'var(--theme-status-success, var(--success))'
      : trend && trend < 0
        ? 'var(--theme-status-error, var(--danger))'
        : 'var(--theme-text-muted, var(--fg-3))'

  const Component = isClickable ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={`relative overflow-hidden text-left transition-all ${
        isClickable ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : ''
      }`}
      style={{
        background: 'var(--theme-bg-secondary, var(--bg-2))',
        border: '1px solid var(--theme-border-default, var(--border-1))',
        borderRadius: 'var(--theme-radius-lg, 10px)',
        boxShadow: 'var(--theme-shadow-sm, 0 1px 0 rgba(9,9,11,0.02))',
        padding: '14px 16px 16px',
      }}
    >
      {/* Top row: icon LEFT, trend RIGHT */}
      <div className="flex items-center justify-between mb-3">
        {icon && (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: colors.iconBg, color: colors.iconColor }}
          >
            {icon}
          </div>
        )}
        {typeof trend === 'number' && (
          <div
            className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums"
            style={{
              background: `color-mix(in srgb, ${trendColor} 12%, transparent)`,
              color: trendColor,
            }}
          >
            <TrendIcon className="h-3 w-3" />
            <span>{trend > 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
      </div>

      {/* Label (uppercase, muted) */}
      <p
        className="text-[11px] font-semibold uppercase tracking-wider mb-1"
        style={{ color: 'var(--theme-text-muted, var(--fg-3))' }}
      >
        {label}
      </p>

      {/* Value (bold, display) */}
      <p
        className="font-bold leading-none tabular-nums text-2xl lg:text-[28px] tracking-tight mb-1"
        style={{
          fontFamily: 'var(--font-display, inherit)',
          color: valueColor ?? 'var(--theme-text-primary, var(--fg-1))',
        }}
      >
        {value}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted, var(--fg-3))' }}>
          {subtitle}
        </p>
      )}

      {/* Trend label */}
      {trendLabel && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--theme-text-muted, var(--fg-3))' }}>
          {trendLabel}
        </p>
      )}

      {/* Sparkline at bottom */}
      {sparkData && sparkData.length >= 2 && (
        <div className="absolute right-0 bottom-0 left-0">
          <SparklineChart data={sparkData} color={colors.sparkColor} />
        </div>
      )}
    </Component>
  )
}

// ─── StatsGrid ──────────────────────────────────────────────────────────────

export function StatsGrid({ stats, columns, gap = 'md' }: StatsGridProps) {
  const cols = columns ?? (stats.length <= 2 ? 2 : stats.length <= 3 ? 3 : 4)

  const gapClass = gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-4' : 'gap-2.5'

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
