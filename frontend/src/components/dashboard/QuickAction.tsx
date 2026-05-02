import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'

interface QuickActionProps {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
  onClick?: () => void
}

export function QuickAction({ icon: Icon, title, description, badge, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border p-3.5 text-left transition-[var(--transition-smooth)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
        boxShadow: 'var(--shadow-sm)',
        touchAction: 'manipulation',
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-[var(--transition-smooth)]"
        style={{
          background: 'var(--theme-brand-primary-light)',
          color: 'var(--theme-brand-primary)',
        }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            {title}
          </p>
          {badge && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                background: 'color-mix(in srgb, var(--theme-status-warning) 15%, transparent)',
                color: 'var(--theme-status-warning)',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="truncate text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {description}
        </p>
      </div>
      <ArrowRight
        className="h-4 w-4 shrink-0 transition-[var(--transition-smooth)] group-hover:translate-x-0.5"
        style={{ color: 'var(--theme-text-muted)' }}
      />
    </button>
  )
}
