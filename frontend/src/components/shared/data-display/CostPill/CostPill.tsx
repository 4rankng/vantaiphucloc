import type React from 'react'

export function CostPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  accent: string
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${accent}12`, color: accent }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums" style={{ color: accent }}>
          {value}
        </p>
      </div>
    </div>
  )
}
