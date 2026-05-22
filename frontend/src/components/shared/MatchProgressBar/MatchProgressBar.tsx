export interface MatchProgressBarProps {
  pct: number
}

export function MatchProgressBar({ pct }: MatchProgressBarProps) {
  return (
    <div className="flex items-center gap-2.5 mt-2.5">
      <div className="flex-1 relative" style={{ height: 4, background: 'var(--surface-3)', borderRadius: 999, maxWidth: 240 }}>
        <div
          style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${Math.min(pct, 100)}%`,
            background: pct >= 90 ? 'var(--success, #10b981)' : pct >= 60 ? 'var(--warning, #f59e0b)' : 'var(--accent)',
            borderRadius: 999, transition: 'width 0.4s ease',
          }}
        />
      </div>
      <span className="text-[11.5px] font-semibold tabular-nums" style={{ color: 'var(--ink-2)' }}>
        {pct}% đã ghép
      </span>
    </div>
  )
}
