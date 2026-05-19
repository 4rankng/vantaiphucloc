export interface ToolbarProps {
  children: React.ReactNode
  /** Add a bottom hairline border (useful when Toolbar sits above a table). */
  bordered?: boolean
  className?: string
}

export function Toolbar({ children, bordered = false, className = '' }: ToolbarProps) {
  return (
    <div
      className={`flex items-center gap-2.5 flex-wrap ${className}`}
      style={{
        padding: '12px',
        background: 'var(--surface)',
        borderBottom: bordered ? '1px solid var(--line)' : 'none',
      }}
    >
      {children}
    </div>
  )
}

export function ToolbarSpacer() {
  return <div className="flex-1" />
}
