export function StatPill({
  count,
  label,
  accent,
}: {
  count: number | string
  label: string
  accent?: boolean
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium"
      style={{
        background: accent ? 'var(--accent-soft)' : 'var(--surface-3)',
        color: accent ? 'var(--accent)' : 'var(--ink-2)',
        // Non-accent variant gets a subtle border so it doesn't float against white backgrounds
        border: accent ? 'none' : '1px solid var(--line)',
      }}
    >
      <span
        className="tabular-nums font-bold"
        style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}
      >
        {count}
      </span>
      {label}
    </span>
  )
}
