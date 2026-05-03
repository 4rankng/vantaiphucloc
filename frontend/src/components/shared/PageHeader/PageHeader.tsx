import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Optional Add/Create button shortcut (renders only on lg+ when used) */
  onAdd?: () => void
  addLabel?: string
  /** Arbitrary action area (rendered on the right, after the optional Add button) */
  actions?: ReactNode
  breadcrumbs?: ReactNode
  /** Compact variant for embedded headers (no top spacing) */
  compact?: boolean
}

/**
 * Modern SaaS page header — Linear/Vercel inspired.
 *
 * Layout:
 *   [breadcrumbs]
 *   ┌──────────────────────────────────────────────────────┐
 *   │ Title                                  [actions] [+] │
 *   │ Subtitle                                              │
 *   └──────────────────────────────────────────────────────┘
 */
export function PageHeader({
  title,
  subtitle,
  onAdd,
  addLabel = 'Tạo mới',
  actions,
  breadcrumbs,
  compact = false,
}: PageHeaderProps) {
  return (
    <div className={compact ? '' : 'mb-4 lg:mb-6'}>
      {breadcrumbs && <div className="mb-3">{breadcrumbs}</div>}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="typo-h1 lg:typo-display truncate">{title}</h1>
          {subtitle && (
            <p className="typo-body-sm mt-1 line-clamp-2">{subtitle}</p>
          )}
        </div>
        {(actions || onAdd) && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
            {onAdd && (
              <button
                onClick={onAdd}
                className="btn-primary"
              >
                <Plus size={16} strokeWidth={2.25} />
                <span className="hidden sm:inline">{addLabel}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
