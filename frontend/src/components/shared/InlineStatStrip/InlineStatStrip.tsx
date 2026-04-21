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
 * Inline stat strip — matching payroll frontend pattern.
 * Rounded border container, cells with 1px gap, value + label per cell.
 * All colors via theme tokens.
 */
export function InlineStatStrip({ items, className }: InlineStatStripProps) {
  if (!items.length) return null

  const cols = items.length <= 4 ? 'flex' : 'grid grid-cols-2'

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden gap-px',
        className,
      )}
      style={{
        background: 'var(--theme-border-default)',
        border: '1px solid var(--theme-border-default)',
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
                'flex flex-col items-center justify-center gap-1 px-3 py-3 flex-1 min-w-0 transition-colors',
                item.onClick && 'cursor-pointer',
              )}
              style={{ background: item.highlight ? 'var(--theme-brand-primary-light)' : 'var(--theme-bg-secondary)' }}
              onClick={item.onClick}
              role={item.onClick ? 'button' : undefined}
            >
              <span
                className="text-[13px] font-semibold tabular-nums tracking-tight leading-tight w-full text-center"
                style={{ color: item.highlight ? 'var(--theme-brand-primary)' : 'var(--theme-text-primary)' }}
              >
                {formatted}
              </span>
              <span
                className="text-[11px] leading-none text-center truncate w-full px-1 mt-0.5"
                style={{ color: 'var(--theme-text-muted)' }}
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
 * Section stat card with icon — matching payroll frontend pattern.
 * Icon in colored circle, value + label below.
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
        'rounded-xl p-4 border',
        onClick && 'cursor-pointer active:scale-[0.98] transition-transform',
      )}
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
        boxShadow: 'var(--theme-shadow-sm)',
      }}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}15` }}
        >
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
          <p className="text-lg font-bold tabular-nums leading-tight" style={{ color: 'var(--theme-text-primary)' }}>{formatted}</p>
        </div>
      </div>
    </div>
  )
}
