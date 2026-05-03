import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { BrandIcon, type BrandIconName } from '@/components/atoms/BrandIcon'

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
  /** Branded PNG icon shown to the left of the title for visual identity. */
  icon?: BrandIconName
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
  icon,
}: PageHeaderProps) {
  return (
    <div
      className={`page-header-band rounded-xl ${compact ? 'px-4 py-3' : 'px-5 py-4 mb-4 lg:mb-6'}`}
    >
      {breadcrumbs && <div className="mb-3">{breadcrumbs}</div>}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Brand accent bar */}
          {!icon && (
            <span
              aria-hidden="true"
              className="hidden lg:block shrink-0 self-stretch rounded-full"
              style={{
                width: '3px',
                minHeight: '24px',
                background: 'var(--theme-brand-primary)',
                opacity: 0.7,
              }}
            />
          )}
          {icon && (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl lg:h-12 lg:w-12"
              style={{
                background: 'var(--theme-brand-primary-light)',
                boxShadow: '0 0 0 1px color-mix(in srgb, var(--theme-brand-primary) 18%, transparent)',
              }}
            >
              <BrandIcon name={icon} size={32} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="typo-h1 lg:typo-display truncate">{title}</h1>
            {subtitle && (
              <p className="typo-body-sm mt-1 line-clamp-2">{subtitle}</p>
            )}
          </div>
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
