import type { ElementType, ReactNode } from 'react'

type KpiColor = 'blue' | 'emerald' | 'amber' | 'rose'

export interface KpiHeroCardProps {
  label: string
  value: string | number
  formattedValue?: ReactNode
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
    iconBg: 'color-mix(in srgb, var(--theme-status-info) 10%, transparent)',
    iconText: 'var(--theme-status-info)',
  },
  emerald: {
    iconBg: 'color-mix(in srgb, var(--theme-status-success) 10%, transparent)',
    iconText: 'var(--theme-status-success)',
  },
  amber: {
    iconBg: 'color-mix(in srgb, var(--theme-status-warning) 10%, transparent)',
    iconText: 'var(--theme-status-warning)',
  },
  rose: {
    iconBg: 'color-mix(in srgb, var(--theme-status-error) 10%, transparent)',
    iconText: 'var(--theme-status-error)',
  },
}

const BADGE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: 'color-mix(in srgb, var(--theme-status-success) 10%, transparent)', border: 'var(--theme-status-success)', text: 'var(--theme-status-success)' },
  warning: { bg: 'color-mix(in srgb, var(--theme-status-warning) 10%, transparent)', border: 'var(--theme-status-warning)', text: 'var(--theme-status-warning)' },
  danger: { bg: 'color-mix(in srgb, var(--theme-status-error) 10%, transparent)', border: 'var(--theme-status-error)', text: 'var(--theme-status-error)' },
  neutral: { bg: 'color-mix(in srgb, var(--theme-text-muted) 10%, transparent)', border: 'var(--theme-text-muted)', text: 'var(--theme-text-secondary)' },
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
      className={`relative rounded-xl border transition-all duration-200 text-left w-full ${
        onClick ? 'cursor-pointer active:opacity-90' : ''
      } ${className}`}
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
        boxShadow: 'none',
      }}
    >
      {/*
        Deterministic 3-row layout on the right of the icon:
          row 1: LABEL (left) + trend/badge pill (right)
          row 2: VALUE (large, single line, truncates)
          row 3: sublabel (muted, single line, truncates)
        All cards have identical structure regardless of sublabel / value length,
        so a trio of KpiHeroCards in a grid is always visually aligned.
      */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* icon — vertically centered */}
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
          style={{ background: c.iconBg }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: c.iconText }} />
        </div>

        {/* right column: label+pill / value / sublabel — stacked */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* row 1: label + trend/badge pill */}
          <div className="flex items-center gap-2 min-w-0">
            <p
              className="flex-1 truncate text-[11px] font-semibold uppercase tracking-widest leading-tight"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              {label}
            </p>

            {trend && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0"
                style={{
                  background: trend.positive
                    ? 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)'
                    : 'color-mix(in srgb, var(--theme-status-error) 12%, transparent)',
                  color: trend.positive
                    ? 'var(--theme-status-success)'
                    : 'var(--theme-status-error)',
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

          {/* row 2: value — display font for financial impact */}
          <p
            className="mt-1 font-bold tabular-nums leading-none"
            style={{
              color: 'var(--theme-text-primary)',
              fontFamily: 'var(--theme-font-display)',
              fontSize: '0.875rem',       /* 14px — fits full numbers on mobile */
              letterSpacing: '-0.025em',
            }}
          >
            {displayValue}
          </p>

          {/* row 3: sublabel (reserves the line even when missing so heights match) */}
          <p
            className="truncate text-[11px] leading-tight"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            {sublabel ?? ' '}
          </p>
        </div>
      </div>
    </Component>
  )
}
