import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  trend?: { value: string; positive?: boolean }
  tone?: 'primary' | 'warning' | 'info' | 'neutral'
  onClick?: () => void
}

const toneStyles = {
  primary: {
    iconBg: 'var(--theme-brand-primary-light)',
    iconColor: 'var(--theme-brand-primary)',
    accent: 'linear-gradient(to top, color-mix(in srgb, var(--theme-brand-primary) 5%, transparent), transparent)',
  },
  warning: {
    iconBg: 'var(--theme-status-warning-light)',
    iconColor: 'var(--theme-status-warning)',
    accent: 'linear-gradient(to top, color-mix(in srgb, var(--theme-status-warning) 8%, transparent), transparent)',
  },
  info: {
    iconBg: 'color-mix(in srgb, var(--theme-status-info, #3b82f6) 10%, transparent)',
    iconColor: 'var(--theme-status-info, #3b82f6)',
    accent: 'linear-gradient(to top, color-mix(in srgb, var(--theme-status-info, #3b82f6) 5%, transparent), transparent)',
  },
  neutral: {
    iconBg: 'var(--theme-bg-tertiary)',
    iconColor: 'var(--theme-text-muted)',
    accent: 'none',
  },
} as const

export function StatCard({ icon: Icon, label, value, hint, trend, tone = 'primary', onClick }: StatCardProps) {
  const styles = toneStyles[tone]
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border p-4 text-left transition-[var(--transition-smooth)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
        boxShadow: 'var(--shadow-sm)',
        ...(onClick ? { cursor: 'pointer', touchAction: 'manipulation' } : {}),
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: styles.accent }}
      />

      <div className="relative flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: styles.iconBg }}
        >
          <Icon className="h-4 w-4" style={{ color: styles.iconColor }} />
        </div>
        {trend && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{
              background: trend.positive
                ? 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)'
                : 'color-mix(in srgb, var(--theme-status-error) 10%, transparent)',
              color: trend.positive
                ? 'var(--theme-brand-primary)'
                : 'var(--theme-status-error)',
            }}
          >
            {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend.value}
          </span>
        )}
      </div>

      <div className="relative mt-3">
        <p className="text-lg font-bold tracking-tight tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
          {value}
        </p>
        <p className="mt-0.5 text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
          {label}
        </p>
        {hint && (
          <p className="mt-1 text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
            {hint}
          </p>
        )}
      </div>
    </Tag>
  )
}
