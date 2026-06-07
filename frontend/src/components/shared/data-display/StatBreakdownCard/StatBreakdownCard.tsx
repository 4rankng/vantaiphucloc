export interface StatBreakdownItem {
  label: string
  value: string | number
}

export interface StatBreakdownCardProps {
  label: string
  total: string | number
  items: StatBreakdownItem[]
  minRows?: number
}

export function StatBreakdownCard({ label, total, items = [], minRows = 0 }: StatBreakdownCardProps) {
  const padded = [...items]
  while (padded.length < minRows) padded.push({ label: '', value: '' })
  return (
    <div
      className="w-full rounded-xl transition-all duration-300"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
        boxShadow: 'none',
      }}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Total — mobile: horizontal row, sm+: vertical column */}
        <div className="flex items-center justify-between p-3 sm:flex-col sm:items-center sm:justify-center sm:self-stretch sm:w-[40%] border-b border-[var(--theme-border-light)] sm:border-b-0 sm:border-r">
          <p className="text-[9px] font-bold tracking-widest uppercase sm:hidden" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
          <p className="text-xl font-extrabold tracking-tight sm:text-lg" style={{ color: 'var(--theme-text-primary)' }}>{total}</p>
          <p className="hidden sm:block text-[9px] font-bold tracking-widest uppercase mt-0.5 text-center" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
        </div>

        {/* Breakdown */}
        <div className="sm:w-[60%] flex flex-col">
          {padded.map((item, i) => (
            <div
              key={item.label || `empty-${i}`}
              className="flex items-center justify-between px-3 py-2"
              style={{ borderBottom: i < padded.length - 1 ? '1px solid var(--theme-border-light)' : 'none' }}
            >
              {item.label ? (
                <>
                  <span className="type-overline" style={{ color: 'var(--theme-text-muted)' }}>{item.label}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{item.value}</span>
                </>
              ) : (
                <>
                  <span className="text-[10px]">&nbsp;</span>
                  <span className="text-sm">&nbsp;</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
