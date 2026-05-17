export interface StatBreakdownItem {
  label: string
  value: string | number
}

export interface StatBreakdownCardProps {
  label: string
  total: string | number
  items: StatBreakdownItem[]
}

export function StatBreakdownCard({ label, total, items = [] }: StatBreakdownCardProps) {
  return (
    <div
      className="w-full rounded-xl transition-all duration-300"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
        boxShadow: '0 4px 12px -4px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Total — mobile: horizontal row, sm+: vertical column */}
        <div className="flex items-center justify-between p-3 sm:flex-col sm:items-center sm:justify-center sm:w-[40%] border-b border-[var(--theme-border-light)] sm:border-b-0 sm:border-r">
          <p className="text-[9px] font-bold tracking-widest uppercase sm:hidden" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
          <p className="text-xl font-extrabold tracking-tight sm:text-lg" style={{ color: 'var(--theme-text-primary)' }}>{total}</p>
          <p className="hidden sm:block text-[9px] font-bold tracking-widest uppercase mt-0.5 text-center" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
        </div>

        {/* Breakdown */}
        <div className="sm:w-[60%] flex flex-col">
          {items.map((item, i) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-3 py-2"
              style={{ borderBottom: i < items.length - 1 ? '1px solid var(--theme-border-light)' : 'none' }}
            >
              <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--theme-text-muted)' }}>{item.label}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
