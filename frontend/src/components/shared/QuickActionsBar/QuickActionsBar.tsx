import { type ReactNode } from 'react'

export interface QuickAction {
  /** Unique identifier */
  id: string
  /** Button label */
  label: string
  /** Icon component */
  icon?: ReactNode
  /** Click handler */
  onClick: () => void
  /** Primary action styling */
  primary?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Loading state */
  loading?: boolean
  /** Keyboard shortcut hint (e.g., "Ctrl+S") */
  shortcut?: string
  /** Hide on mobile */
  hideOnMobile?: boolean
}

export interface QuickActionsBarProps {
  /** List of actions */
  actions: QuickAction[]
  /** Alignment of actions */
  align?: 'left' | 'center' | 'right'
  /** Gap between actions */
  gap?: 'sm' | 'md' | 'lg'
  /** Additional className */
  className?: string
}

export function QuickActionsBar({
  actions,
  align = 'left',
  gap = 'md',
  className = '',
}: QuickActionsBarProps) {
  const alignClass =
    align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
  const gapClass = gap === 'sm' ? 'gap-1.5' : gap === 'lg' ? 'gap-4' : 'gap-2'

  return (
    <div className={`flex flex-wrap items-center ${alignClass} ${gapClass} ${className}`}>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          disabled={action.disabled || action.loading}
          className={`
            flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold
            transition-all hover:opacity-90 active:scale-[0.97] touch-manipulation
            disabled:opacity-50 disabled:cursor-not-allowed
            ${action.hideOnMobile ? 'hidden sm:flex' : 'flex'}
          `}
          style={{
            background: action.primary
              ? 'var(--theme-brand-primary)'
              : 'var(--theme-bg-secondary)',
            color: action.primary ? '#fff' : 'var(--theme-text-primary)',
            border: action.primary ? 'none' : '1px solid var(--theme-border-default)',
          }}
        >
          {action.loading ? (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2"
              style={{
                borderColor: action.primary ? 'rgba(255,255,255,0.3)' : 'var(--theme-border-default)',
                borderTopColor: action.primary ? '#fff' : 'var(--theme-brand-primary)',
              }}
            />
          ) : (
            action.icon && <span className="shrink-0">{action.icon}</span>
          )}
          <span>{action.label}</span>
          {action.shortcut && (
            <kbd
              className="hidden lg:inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-mono"
              style={{
                background: action.primary ? 'rgba(255,255,255,0.2)' : 'var(--theme-bg-tertiary)',
                color: action.primary ? 'rgba(255,255,255,0.8)' : 'var(--theme-text-muted)',
              }}
            >
              {action.shortcut}
            </kbd>
          )}
        </button>
      ))}
    </div>
  )
}
