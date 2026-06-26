export interface DonutSlice { name: string; pct: number; color: string }

export function CostDonut({ slices, total }: { slices: DonutSlice[]; total: string }) {
  let offset = 0
  const segs = slices.map(s => {
    const seg = { color: s.color, dasharray: `${s.pct} ${100 - s.pct}`, dashoffset: -offset }
    offset += s.pct
    return seg
  })
  return (
    <div className="relative flex-shrink-0" style={{ width: 150, height: 150 }}>
      <svg viewBox="0 0 42 42" style={{ width: 150, height: 150, transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--theme-border-light, #eef1ef)" strokeWidth="3" />
        {/* Segments */}
        {segs.map((s, i) => (
          <circle
            key={i}
            cx="21"
            cy="21"
            r="15.9"
            fill="none"
            stroke={s.color}
            strokeWidth="3.6"
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 select-none">
        <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase mb-1">Tổng chi</span>
        <span className="font-mono font-extrabold text-[16px] tracking-tight leading-none" style={{ color: 'var(--theme-text-primary)' }}>
          {total.replace(/[a-zA-ZđĐ]+$/, '')}
        </span>
        <span className="text-[10px] font-bold text-theme-muted uppercase mt-1">VND</span>
      </div>
    </div>
  )
}
