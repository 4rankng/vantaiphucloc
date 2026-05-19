import type { LucideIcon } from 'lucide-react'

export interface FilterPillProps {
  icon?: LucideIcon
  /** Visible label, may include a count. */
  children: React.ReactNode
  isActive?: boolean
  onClick?: () => void
  className?: string
  /** Optional <strong>-style value inside the pill. */
  value?: React.ReactNode
}

export function FilterPill({ icon: Icon, children, isActive = false, onClick, className = '', value }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`nepo-filter-pill inline-flex items-center gap-1.5 ${isActive ? 'is-active' : ''} ${className}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2} />}
      <span>{children}</span>
      {value !== undefined && (
        <span className="font-semibold" style={{ color: isActive ? '#fff' : 'var(--ink)' }}>
          {value}
        </span>
      )}
    </button>
  )
}
