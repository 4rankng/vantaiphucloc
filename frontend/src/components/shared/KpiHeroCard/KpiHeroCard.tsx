import type { ElementType } from 'react'

type KpiColor = 'blue' | 'emerald' | 'amber' | 'rose'

export interface KpiHeroCardProps {
  label: string
  value: string | number
  formattedValue?: string
  icon: ElementType
  color: KpiColor
  sublabel?: string
  trend?: { value: string; positive: boolean }
  badge?: { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }
  onClick?: () => void
  className?: string
}

const COLOR_MAP: Record<KpiColor, { iconBg: string; iconText: string }> = {
  blue: {
    iconBg: 'color-mix(in srgb, #2563EB 10%, transparent)',
    iconText: '#2563EB',
  },
  emerald: {
    iconBg: 'color-mix(in srgb, #10B981 10%, transparent)',
    iconText: '#10B981',
  },
  amber: {
    iconBg: 'color-mix(in srgb, #F59E0B 10%, transparent)',
    iconText: '#F59E0B',
  },
  rose: {
    iconBg: 'color-mix(in srgb, #F43F5E 10%, transparent)',
    iconText: '#F43F5E',
  },
}

const BADGE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: 'color-mix(in srgb, #10B981 10%, transparent)', border: '#10B981', text: '#059669' },
  warning: { bg: 'color-mix(in srgb, #F59E0B 10%, transparent)', border: '#F59E0B', text: '#D97706' },
  danger: { bg: 'color-mix(in srgb, #EF4444 10%, transparent)', border: '#EF4444', text: '#DC2626' },
  neutral: { bg: 'color-mix(in srgb, #6B7280 10%, transparent)', border: '#6B7280', text: '#4B5563' },
}

export function KpiHeroCard({
  label,
  value,
  formattedValue,
  icon: Icon,
  color,
  sublabel,
  trend,
  badge,
  onClick,
  className = '',
}: KpiHeroCardProps) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue

  const displayValue = formattedValue
    ? formattedValue
    : typeof value === 'number'
      ? value.toLocaleString('vi-VN')
      : String(value)

  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border transition-all duration-200 text-left w-full ${
        onClick ? 'cursor-pointer hover:shadow-lg active:scale-[0.98]' : ''
      } ${className}`}
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
        boxShadow: '0 0 0 1px rgba(9,9,11,0.03), 0 1px 3px rgba(9,9,11,0.06), 0 4px 16px -4px rgba(9,9,11,0.06)',
      }}
    >
      {/* Single-row: [icon+label] ··· [value+pill] — value wraps to next row when card is narrow */}
      <div className="flex items-center gap-3 px-4 py-3.5 flex-wrap">
        {/* icon + label grouped so they always move together */}
        <div className="flex items-center gap-2.5 shrink min-w-0">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: c.iconBg }}
          >
            <Icon className="h-4.5 w-4.5" style={{ color: c.iconText }} />
          </div>
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-widest leading-tight"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              {label}
            </p>
            {sublabel && (
              <p className="text-[11px] mt-0.5 leading-tight" style={{ color: 'var(--theme-text-muted)' }}>
                {sublabel}
              </p>
            )}
          </div>
        </div>

        {/* value + pill: ml-auto pushes right; wraps to its own row when card is too narrow */}
        <div className="flex items-baseline gap-2 flex-wrap ml-auto shrink-0">
          <p
            className="font-bold tabular-nums leading-none tracking-tight text-[18px]"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {displayValue}
          </p>

          {trend && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0"
              style={{
                background: trend.positive
                  ? 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)'
                  : 'color-mix(in srgb, var(--theme-status-error, #EF4444) 12%, transparent)',
                color: trend.positive
                  ? 'var(--theme-status-success, #10B981)'
                  : 'var(--theme-status-error, #EF4444)',
              }}
            >
              <span>{trend.positive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
            </span>
          )}

          {badge && (() => {
            const bs = BADGE_STYLES[badge.variant] ?? BADGE_STYLES.neutral
            return (
              <span
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0"
                style={{ background: bs.bg, borderColor: bs.border, color: bs.text }}
              >
                {badge.label}
              </span>
            )
          })()}
        </div>
      </div>
    </Component>
  )
}
