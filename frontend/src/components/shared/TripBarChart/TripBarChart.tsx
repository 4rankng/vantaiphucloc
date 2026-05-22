export interface TripBarChartBar {
  day: number
  matched: number
  pending: number
}

export interface TripBarChartProps {
  bars: TripBarChartBar[]
  height?: number
}

export function TripBarChart({ bars, height = 96 }: TripBarChartProps) {
  const maxTotal = Math.max(1, ...bars.map(b => b.matched + b.pending))
  const HEIGHT = height

  return (
    <div>
      <div className="flex items-end gap-[2px]" style={{ height: HEIGHT }}>
        {bars.map(b => {
          const matchedH = Math.round((b.matched / maxTotal) * HEIGHT)
          const pendingH = Math.round((b.pending / maxTotal) * HEIGHT)
          const total = b.matched + b.pending
          return (
            <div key={b.day} className="flex flex-1 flex-col items-stretch gap-[1px]" style={{ height: HEIGHT, justifyContent: 'flex-end' }}>
              {b.pending > 0 && (
                <div className="rounded-t-[2px]" style={{ height: Math.max(3, pendingH), background: 'var(--theme-status-warning)', opacity: 0.85 }} />
              )}
              {b.matched > 0 && (
                <div style={{ height: Math.max(3, matchedH), background: 'var(--theme-status-success)', borderRadius: b.pending === 0 ? '2px 2px 0 0' : '0' }} />
              )}
              {total === 0 && (
                <div style={{ height: 3, background: 'var(--theme-border-light)', borderRadius: '2px 2px 0 0' }} />
              )}
            </div>
          )
        })}
      </div>
      <div className="flex gap-[2px] mt-1.5">
        {bars.map(b => (
          <div key={b.day} className="flex-1 text-center" style={{ fontSize: 8, color: 'var(--theme-text-muted)' }}>
            {b.day % 5 === 1 ? b.day : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
