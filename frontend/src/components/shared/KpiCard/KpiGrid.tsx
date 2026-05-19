export interface KpiGridProps {
  children: React.ReactNode
  className?: string
}

export function KpiGrid({ children, className = '' }: KpiGridProps) {
  return <div className={`nepo-kpi-grid ${className}`}>{children}</div>
}
