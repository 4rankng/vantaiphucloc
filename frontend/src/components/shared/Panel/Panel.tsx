export interface PanelProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  /** Right-side actions slot in the panel header. */
  actions?: React.ReactNode
  /** When true, removes default padding from the body. Use for flush table layouts. */
  flush?: boolean
  className?: string
  children: React.ReactNode
}

export function Panel({ title, subtitle, actions, flush = false, className = '', children }: PanelProps) {
  const hasHead = title !== undefined || subtitle !== undefined || actions !== undefined

  return (
    <section
      className={`overflow-hidden ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
      }}
    >
      {hasHead && (
        <header
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div className="min-w-0">
            {title && (
              <h2
                className="m-0 truncate"
                style={{
                  fontFamily: 'var(--theme-font-display)',
                  fontSize: '16px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className="m-0 mt-0.5 truncate"
                style={{ fontSize: '12px', color: 'var(--ink-3)' }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={flush ? '' : 'px-5 pt-3.5 pb-5'}>{children}</div>
    </section>
  )
}
