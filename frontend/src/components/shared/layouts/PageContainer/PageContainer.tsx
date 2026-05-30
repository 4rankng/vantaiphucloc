import { type ReactNode } from 'react'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export interface PageContainerProps {
  children: ReactNode
  /** Page title shown in header */
  title?: string
  /** Optional subtitle/description */
  subtitle?: string
  /** Breadcrumbs - array of { label, href } or just strings */
  breadcrumbs?: Array<{ label: string; href?: string } | string>
  /** Show back button */
  showBack?: boolean
  /** Custom back handler (defaults to navigate(-1)) */
  onBack?: () => void
  /** Actions to show in header (e.g., buttons) */
  actions?: ReactNode
  /** Additional actions in dropdown menu */
  moreActions?: Array<{ label: string; onClick: () => void; icon?: ReactNode; danger?: boolean }>
  /** Full width mode (no max-width constraint) */
  fullWidth?: boolean
  /** Remove default padding */
  noPadding?: boolean
  /** Custom className for the content wrapper */
  className?: string
}

export function PageContainer({
  children,
  title,
  subtitle,
  breadcrumbs,
  showBack = false,
  onBack,
  actions,
  moreActions,
  fullWidth = false,
  noPadding = false,
  className = '',
}: PageContainerProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  const hasHeader = title || breadcrumbs || showBack || actions

  return (
    <div className={`min-h-full ${noPadding ? '' : 'py-6'}`}>
      <div className={fullWidth ? 'w-full' : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'}>
        {/* Header */}
        {hasHeader && (
          <header className="mb-6">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="mb-3">
                <ol className="flex items-center gap-1.5 text-sm">
                  {breadcrumbs.map((crumb, idx) => {
                    const isLast = idx === breadcrumbs.length - 1
                    const label = typeof crumb === 'string' ? crumb : crumb.label
                    const href = typeof crumb === 'string' ? undefined : crumb.href

                    return (
                      <li key={idx} className="flex items-center gap-1.5">
                        {href && !isLast ? (
                          <button
                            onClick={() => navigate(href)}
                            className="font-medium transition-colors hover:opacity-80"
                            style={{ color: 'var(--theme-text-muted)' }}
                          >
                            {label}
                          </button>
                        ) : (
                          <span
                            className="font-medium"
                            style={{ color: isLast ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}
                          >
                            {label}
                          </span>
                        )}
                        {!isLast && (
                          <span style={{ color: 'var(--theme-text-muted)' }}>/</span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </nav>
            )}

            {/* Title row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {showBack && (
                  <button
                    onClick={handleBack}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors hover:opacity-80"
                    style={{
                      background: 'var(--theme-bg-tertiary)',
                      color: 'var(--theme-text-primary)',
                    }}
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="min-w-0">
                  {title && (
                    <h1
                      className="typo-h1 font-display leading-tight truncate lg:typo-display"
                      style={{ color: 'var(--theme-text-primary)' }}
                    >
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p
                      className="mt-0.5 text-sm truncate"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              {(actions || moreActions) && (
                <div className="flex items-center gap-2 shrink-0">
                  {actions}
                  {moreActions && moreActions.length > 0 && (
                    <div className="relative group">
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:opacity-80"
                        style={{
                          background: 'var(--theme-bg-tertiary)',
                          color: 'var(--theme-text-primary)',
                        }}
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {/* Dropdown - shown on hover/focus */}
                      <div
                        className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all"
                        style={{
                          background: 'var(--theme-bg-secondary)',
                          borderColor: 'var(--theme-border-default)',
                          boxShadow: 'var(--theme-shadow-elevated)',
                        }}
                      >
                        {moreActions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={action.onClick}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
                            style={{
                              color: action.danger ? 'var(--theme-status-error)' : 'var(--theme-text-primary)',
                              background: 'transparent',
                            }}
                          >
                            {action.icon}
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>
        )}

        {/* Content */}
        <div className={className}>{children}</div>
      </div>
    </div>
  )
}
