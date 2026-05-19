import type { LucideIcon } from 'lucide-react'

export type KpiVariant = 'default' | 'accent' | 'success' | 'warn' | 'danger' | 'info'

const ICON_STYLES: Record<KpiVariant, { background: string; color: string }> = {
  default: { background: 'var(--surface-3)', color: 'var(--ink-2)' },
  accent:  { background: 'var(--accent-soft)', color: 'var(--accent)' },
  success: { background: 'var(--success-soft)', color: 'var(--success)' },
  warn:    { background: 'var(--warning-soft)', color: 'var(--warning)' },
  danger:  { background: 'var(--danger-soft)', color: 'var(--danger)' },
  info:    { background: 'var(--info-soft)', color: 'var(--info)' },
}

export interface KpiCardProps {
  label: React.ReactNode
  /** Primary value (already formatted). Numbers are rendered with tabular nums. */
  value: React.ReactNode
  /** Optional unit/suffix, e.g. "đ" or "%". Rendered smaller next to value. */
  unit?: React.ReactNode
  /** Right-side icon. */
  icon?: LucideIcon
  /** Color variant — controls icon background. */
  variant?: KpiVariant
  /** Meta line below value (e.g. trend, comparison). */
  meta?: React.ReactNode
  /** Click handler. When set, card is interactive. */
  onClick?: () => void
  className?: string
}

export function KpiCard({
  label,
  value,
  unit,
  icon: Icon,
  variant = 'default',
  meta,
  onClick,
  className = '',
}: KpiCardProps) {
  const iconStyle = ICON_STYLES[variant]
  const isInteractive = !!onClick

  return (
    <article
      onClick={onClick}
      className={`nepo-kpi relative overflow-hidden ${isInteractive ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        padding: '18px 20px',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="font-semibold uppercase"
          style={{ fontSize: '12px', letterSpacing: '0.06em', color: 'var(--ink-2)' }}
        >
          {label}
        </span>
        {Icon && (
          <span
            className="grid place-items-center shrink-0"
            style={{ width: 36, height: 36, borderRadius: 10, ...iconStyle }}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
        )}
      </div>
      <div
        className="tabular-nums"
        style={{
          fontFamily: 'var(--theme-font-display)',
          fontSize: '32px',
          fontWeight: 600,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          marginBottom: 6,
          color: 'var(--ink)',
        }}
      >
        {value}
        {unit && (
          <span
            className="ml-0.5"
            style={{ fontSize: '16px', fontWeight: 500, color: 'var(--ink-3)' }}
          >
            {unit}
          </span>
        )}
      </div>
      {meta && (
        <div
          className="flex items-center gap-1.5"
          style={{ fontSize: '11.5px', color: 'var(--ink-3)' }}
        >
          {meta}
        </div>
      )}
    </article>
  )
}
