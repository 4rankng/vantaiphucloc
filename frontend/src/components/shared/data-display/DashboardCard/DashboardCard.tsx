interface DashboardCardProps {
  children: React.ReactNode
  className?: string
}

export function DashboardCard({ children, className = '' }: DashboardCardProps) {
  return (
    <div
      className={`rounded-xl border overflow-hidden ${className}`}
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
        boxShadow: 'none',
      }}
    >
      {children}
    </div>
  )
}
