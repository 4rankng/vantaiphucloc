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
        boxShadow: '0 0 0 1px rgba(9,9,11,0.02), 0 1px 3px rgba(9,9,11,0.05), 0 4px 16px -4px rgba(9,9,11,0.05)',
      }}
    >
      {children}
    </div>
  )
}
