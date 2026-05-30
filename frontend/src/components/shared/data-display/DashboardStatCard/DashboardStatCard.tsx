import { SparklineChart } from '@/components/shared/data-display/SparklineChart'

const TONE_COLORS = {
  primary: {
    iconBg: 'var(--theme-brand-primary-light)',
    iconColor: 'var(--theme-brand-primary)',
    sparkColor: 'var(--theme-brand-primary)',
  },
  success: {
    iconBg: 'var(--theme-status-success-light)',
    iconColor: 'var(--theme-status-success)',
    sparkColor: 'var(--theme-status-success)',
  },
  warning: {
    iconBg: 'var(--theme-status-warning-light)',
    iconColor: 'var(--theme-status-warning)',
    sparkColor: 'var(--theme-text-muted)',
  },
  info: {
    iconBg: 'var(--theme-status-info-light)',
    iconColor: 'var(--theme-status-info)',
    sparkColor: 'var(--theme-status-info)',
  },
} as const

type Tone = keyof typeof TONE_COLORS

export interface DashboardStatCardProps {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  trend?: string
  tone: Tone
  sparkData?: number[]
  loading?: boolean
}

export function DashboardStatCard({ label, value, icon, trend, tone, sparkData, loading }: DashboardStatCardProps) {
  const colors = TONE_COLORS[tone]
  const isUp = trend?.startsWith('+')
  const showTrend = trend && trend !== '0%' && trend !== '+0%'

  return (
    <div
      className="relative overflow-hidden transition-all card-hover-lift"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
        borderRadius: 'var(--theme-radius-lg, 12px)',
        boxShadow: 'var(--theme-shadow-sm)',
        padding: '14px 16px 40px',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider leading-tight" style={{ color: 'var(--theme-text-muted)' }}>
          {label}
        </p>
        <span className="shrink-0 flex [&_svg]:h-4 [&_svg]:w-4 mt-px" style={{ color: colors.iconColor, opacity: 0.7 }}>
          {icon}
        </span>
      </div>

      {loading ? (
        <div className="h-7 w-20 rounded animate-pulse mb-2" style={{ background: 'var(--theme-bg-tertiary)' }} />
      ) : (
        <p className="text-[22px] lg:text-[26px] font-bold leading-none tabular-nums tracking-tight mb-2.5" style={{ color: 'var(--theme-text-primary)' }}>
          {value}
        </p>
      )}

      {showTrend && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums"
          style={{
            background: `color-mix(in srgb, ${isUp ? 'var(--theme-status-success)' : 'var(--theme-status-error)'} 14%, transparent)`,
            color: isUp ? 'var(--theme-status-success)' : 'var(--theme-status-error)',
          }}
        >
          {isUp ? (
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5"><polyline points="6 14 12 8 18 14" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5"><polyline points="6 10 12 16 18 10" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
          {trend}
        </span>
      )}

      {sparkData && sparkData.length >= 2 && (
        <div className="absolute right-0 bottom-0 left-0">
          <SparklineChart data={sparkData} color={colors.sparkColor} />
        </div>
      )}
    </div>
  )
}
