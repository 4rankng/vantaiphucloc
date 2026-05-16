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
    sparkColor: 'var(--theme-status-warning, #F59E0B)',
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
  /** When true, going up is bad (e.g. for pending/backlog counters). Flips the trend color. */
  invertTrend?: boolean
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
      className="rounded-xl border p-4 relative overflow-hidden"
      style={{
        background: 'var(--theme-bg-secondary, var(--bg-2))',
        borderColor: 'var(--theme-border-default, var(--border-1))',
        minHeight: 96,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="skeleton-shimmer h-3 w-28 rounded" />
        <div className="skeleton-shimmer h-4 w-4 rounded" />
      </div>
      <div className="skeleton-shimmer h-7 w-24 rounded mb-2" />
      <div className="skeleton-shimmer h-4 w-14 rounded-full" />
    </div>
  )
}

// ─── StatCard ───────────────────────────────────────────────────────────────
//
//  Layout (Stripe-style):
//
//    LABEL TEXT                  [icon]   ← label full-width, bare icon right
//    168,831,000 ₫                        ← big value, left-aligned
//    [↑ +12%]  vs last month              ← trend pill + subtitle
//    ▁▂▃▄▅▆▇  (sparkline, absolute)
//

function StatCard({
  label,
  value,
  icon,
  valueColor,
  trend,
  trendLabel,
  invertTrend = false,
  tone = 'brand',
  sparkData,
  onClick,
  loading,
  subtitle,
}: StatCardProps) {
  if (loading) return <StatCardSkeleton />

  const colors = TONE_COLORS[tone]
  const isClickable = !!onClick

  // Only show trend when there's a meaningful non-zero delta
  const hasTrend = typeof trend === 'number' && Math.abs(trend) >= 1

  const TrendIcon = hasTrend && trend > 0 ? TrendingUp : hasTrend && trend < 0 ? TrendingDown : Minus

  const goodWhenPositive = !invertTrend
  const trendColor = hasTrend
    ? trend > 0
      ? goodWhenPositive ? 'var(--theme-status-success, #10B981)' : 'var(--theme-status-error, #EF4444)'
      : goodWhenPositive ? 'var(--theme-status-error, #EF4444)' : 'var(--theme-status-success, #10B981)'
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
        borderRadius: 'var(--theme-radius-lg, 12px)',
        boxShadow: 'var(--theme-shadow-sm, 0 1px 2px rgba(9,9,11,0.04))',
        padding: '14px 16px 40px',
      }}
    >
      {/* ── Row 1: label left · bare icon right ─── */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p
          className="text-[11px] font-semibold uppercase tracking-wider leading-tight"
          style={{ color: 'var(--theme-text-muted, var(--fg-3))' }}
        >
          {label}
        </p>
        {icon && (
          <span
            className="shrink-0 flex [&_svg]:h-4 [&_svg]:w-4 mt-px"
            style={{ color: colors.iconColor, opacity: 0.7 }}
          >
            {icon}
          </span>
        )}
      </div>

      {/* ── Row 2: value ─── */}
      <p
        className="font-bold leading-none tabular-nums text-[16px] lg:text-[20px] tracking-tight mb-2.5"
        style={{ color: valueColor ?? 'var(--theme-text-primary, var(--fg-1))' }}
      >
        {value}
      </p>

      {/* ── Row 3: trend pill + subtitle ─── */}
      {(hasTrend || subtitle || trendLabel) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {hasTrend && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums"
              style={{
                background: `color-mix(in srgb, ${trendColor} 14%, transparent)`,
                color: trendColor,
              }}
            >
              <TrendIcon className="h-2.5 w-2.5" />
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
          {(subtitle || trendLabel) && (
            <span className="text-[11px]" style={{ color: 'var(--theme-text-muted, var(--fg-3))' }}>
              {subtitle || trendLabel}
            </span>
          )}
        </div>
      )}

      {/* Sparkline pinned to bottom */}
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
