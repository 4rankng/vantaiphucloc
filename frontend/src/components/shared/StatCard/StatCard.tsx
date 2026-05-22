import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TrendIndicator } from '@/components/shared/TrendIndicator'
import { SparklineChart } from '@/components/shared/SparklineChart'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal' | 'gold'

const variantStyles: Record<Variant, { iconBg: string; iconColor: string; sparkColor: string }> = {
  default:  { iconBg: 'bg-slate-100', iconColor: 'text-slate-500', sparkColor: 'var(--theme-text-muted)' },
  success:  { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', sparkColor: 'var(--theme-status-success)' },
  warning:  { iconBg: 'bg-amber-50', iconColor: 'text-amber-600', sparkColor: 'var(--theme-status-warning)' },
  danger:   { iconBg: 'bg-red-50', iconColor: 'text-red-600', sparkColor: 'var(--theme-status-error)' },
  info:     { iconBg: 'bg-blue-50', iconColor: 'text-blue-600', sparkColor: 'var(--theme-status-info)' },
  teal:     { iconBg: 'bg-teal-50', iconColor: 'text-teal-600', sparkColor: 'var(--theme-status-success)' },
  gold:     { iconBg: 'bg-amber-50', iconColor: 'text-amber-600', sparkColor: 'var(--theme-status-warning)' },
}

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string
  unit?: string
  subtitle?: string
  variant?: Variant
  className?: string
  trend?: { direction: 'up' | 'down' | 'flat'; value?: string }
  sparkline?: number[]
}

export function StatCard({
  icon, label, value, unit, subtitle, variant = 'default',
  className, trend, sparkline,
}: StatCardProps) {
  const v = variantStyles[variant]

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-100 bg-white p-4',
        'transition-colors duration-200',
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', v.iconBg)}>
          <span className={cn('flex', v.iconColor)}>{icon}</span>
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="font-mono-num text-2xl font-bold leading-tight tracking-tight text-slate-900">{value}</span>
        {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </div>

      {(trend || subtitle || sparkline) && (
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {trend && <TrendIndicator direction={trend.direction} value={trend.value} />}
            {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
          </div>
          {sparkline && sparkline.length > 0 && (
            <SparklineChart data={sparkline} color={v.sparkColor} height={14} />
          )}
        </div>
      )}
    </div>
  )
}
