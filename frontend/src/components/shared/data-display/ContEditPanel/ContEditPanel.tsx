import { X, Plus } from 'lucide-react'
import { CONT_TYPES } from '@/data/domain'
import type { ContType } from '@/data/domain'
import { ContBadge } from '@/components/shared/data-display/ContBadge'

interface ContEntry { type: string; number: string }

export function ContEditPanel({ containers, onChange, accentColor }: {
  containers: ContEntry[]
  onChange: (containers: ContEntry[]) => void
  accentColor?: string
}) {
  return (
    <div className="space-y-3 w-[280px]">
      {containers.map((c, i) => (
        <div key={i} className="rounded-lg p-2.5 space-y-2" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Container {i + 1}</span>
            {containers.length > 1 && (
              <button onClick={() => onChange(containers.filter((_, j) => j !== i))} className="touch-manipulation p-1 rounded hover:opacity-80" style={{ color: 'var(--theme-status-error)' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {CONT_TYPES.map(w => (
              <button key={w} onClick={() => onChange(containers.map((c2, j) => j === i ? { ...c2, type: w } : c2))}
                className="px-2 py-1 rounded-md text-xs font-bold touch-manipulation transition-colors"
                style={{ background: c.type === w ? (accentColor ?? 'var(--theme-brand-primary)') : 'var(--theme-bg-tertiary)', color: c.type === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}>
                <ContBadge type={w as ContType} />
              </button>
            ))}
          </div>
          <input
            value={c.number}
            onChange={e => onChange(containers.map((c2, j) => j === i ? { ...c2, number: e.target.value } : c2))}
            className="w-full text-sm font-mono h-8 rounded-lg px-2 outline-none"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border-default)' }}
            placeholder="Số container"
            autoFocus={i === containers.length - 1 && !c.number}
          />
        </div>
      ))}
      <button onClick={() => onChange([...containers, { type: 'E20', number: '' }])}
        className="w-full py-2 rounded-lg text-xs font-medium touch-manipulation flex items-center justify-center gap-1.5"
        style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)', border: '1px dashed var(--theme-border-default)' }}>
        <Plus className="w-3.5 h-3.5" /> Thêm container
      </button>
    </div>
  )
}
