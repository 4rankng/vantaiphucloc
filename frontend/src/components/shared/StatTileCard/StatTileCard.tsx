import type { LucideIcon } from 'lucide-react'

interface StatTile {
  id: string
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  accent: string
  accentLight: string
  path: string
}

export function StatTileCard({ data, onClick }: { data: StatTile; onClick: (path: string) => void }) {
  const Icon = data.icon
  return (
    <button
      onClick={() => onClick(data.path)}
      className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.97] touch-manipulation"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
          {data.label}
        </p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: data.accentLight }}>
          <Icon className="w-3.5 h-3.5" style={{ color: data.accent }} />
        </div>
      </div>
      <p className="text-2xl font-bold leading-tight tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
        {data.value}
      </p>
      {data.sub && (
        <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>{data.sub}</p>
      )}
    </button>
  )
}

export type { StatTile }
