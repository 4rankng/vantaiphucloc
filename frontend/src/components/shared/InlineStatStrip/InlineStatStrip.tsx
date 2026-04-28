import { cn } from '@/lib/utils'

export interface StatItem {
  label: string
  value: string | number
  highlight?: boolean
  onClick?: () => void
}

interface InlineStatStripProps {
  items: StatItem[]
  className?: string
}

/**
 * Inline stat strip — Grab-style rounded card with cells.
 */
export function InlineStatStrip({ items, className }: InlineStatStripProps) {
  if (!items.length) return null

  const cols = items.length <= 2 ? 'flex' : 'grid grid-cols-2'

  return (
    <div
      className={cn('rounded-2xl overflow-hidden gap-px', className)}
      style={{
        background: 'var(--theme-border-light)',
        boxShadow: 'var(--theme-shadow-card)',
      }}
    >
      <div className={cn(cols, 'gap-px')}>
        {items.map((item, i) => {
          const formatted = typeof item.value === 'number'
            ? item.value.toLocaleString('vi-VN')
            : item.value

          return (
            <div
              key={i}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-4 flex-1 min-w-0 transition-colors',
                item.onClick && 'cursor-pointer',
              )}
              style={{ background: item.highlight ? 'var(--theme-brand-primary-light)' : 'var(--theme-bg-secondary)' }}
              onClick={item.onClick}
              role={item.onClick ? 'button' : undefined}
            >
              <span
                className="text-base font-bold tabular-nums tracking-tight leading-tight w-full text-center"
                style={{ color: item.highlight ? 'var(--theme-brand-primary)' : 'var(--theme-text-primary)' }}
              >
                {formatted}
              </span>
              <span
                className="text-xs leading-none text-center truncate w-full px-1 mt-0.5"
                style={{ color: 'var(--theme-text-secondary)' }}
              >
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Section stat card with icon — Grab style.
 */
interface StatCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  value: string | number
  color?: string
  onClick?: () => void
}

export function StatCard({ icon: Icon, label, value, color, onClick }: StatCardProps) {
  const formatted = typeof value === 'number' ? value.toLocaleString('vi-VN') : value
  const accentColor = color ?? 'var(--theme-brand-primary)'

  return (
    <div
      className={cn(
        'rounded-2xl p-4 card-lift',
        onClick && 'cursor-pointer',
      )}
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
      }}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--theme-brand-primary-light)' }}
        >
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>{label}</p>
          <p className="text-lg font-bold tabular-nums leading-tight" style={{ color: 'var(--theme-text-primary)' }}>{formatted}</p>
        </div>
      </div>
    </div>
  )
}
