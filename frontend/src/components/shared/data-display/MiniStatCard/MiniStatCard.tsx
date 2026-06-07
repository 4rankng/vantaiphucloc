export interface MiniStatCardProps {
  label: string
  value: React.ReactNode
  className?: string
}

export function MiniStatCard({ label, value, className = '' }: MiniStatCardProps) {
  return (
    <div
      className={`rounded-lg p-3 ${className}`}
      style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
    >
      <p className="type-overline" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
      <p className="type-display tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{value}</p>
    </div>
  )
}
