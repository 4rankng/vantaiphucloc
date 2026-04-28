export function StatsRow({ items }: { items: { label: string; value: string | number; icon?: React.ReactNode; color?: string }[] }) {
  return (
    <div className={`grid grid-cols-${items.length} gap-3`}>
      {items.map(item => (
        <div key={item.label} className="rounded-2xl p-3" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          {item.icon && <div className="flex items-center gap-2 mb-1">{item.icon}</div>}
          <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{item.value}</p>
          <p className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>{item.label}</p>
        </div>
      ))}
    </div>
  )
}
