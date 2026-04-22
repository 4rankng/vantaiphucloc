import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

interface ListItemProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  trailing?: ReactNode
  onClick?: () => void
  className?: string
}

export function ListItem({ icon, title, subtitle, trailing, onClick, className }: ListItemProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-3.5 card-lift ${className ?? ''}`}
      style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--theme-bg-tertiary)' }}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{title}</p>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{subtitle}</p>
          )}
        </div>
        {trailing ?? (onClick && <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />)}
      </div>
    </Tag>
  )
}
