import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'

interface SectionCardProps {
  title: string
  count?: number
  onAction?: () => void
  actionLabel?: string
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}

export function SectionCard({
  title,
  count,
  onAction,
  actionLabel = 'Xem tất cả',
  icon: Icon,
  children,
  className = '',
}: SectionCardProps) {
  return (
    <section
      className={`rounded-2xl border ${className}`}
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--theme-border-default)' }}
      >
        <div className="flex items-center gap-2">
          {Icon && (
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
          )}
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-primary)' }}>
            {title}
          </h3>
          {typeof count === 'number' && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
              style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
            >
              {count}
            </span>
          )}
        </div>
        {onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1 text-[11px] font-semibold transition-[var(--transition-smooth)] hover:gap-1.5"
            style={{ color: 'var(--theme-brand-primary)', touchAction: 'manipulation' }}
          >
            {actionLabel}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}
