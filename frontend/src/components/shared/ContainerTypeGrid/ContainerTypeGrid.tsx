import { CheckCircle } from 'lucide-react'
import { WORK_TYPES, type WorkType } from '@/data/domain'
import { hapticTap } from '@/lib/haptic'
import { playTick } from '@/lib/sound'

interface ContainerTypeGridProps {
  value: WorkType
  onChange: (type: WorkType) => void
  error?: boolean
}

export function ContainerTypeGrid({ value, onChange, error }: ContainerTypeGridProps) {
  const handleSelect = (wt: WorkType) => {
    if (wt === value) return
    hapticTap()
    playTick()
    onChange(wt)
  }

  return (
    <div className="flex gap-1.5">
      {WORK_TYPES.map(wt => {
        const selected = value === wt
        return (
          <button
            key={wt}
            onClick={() => handleSelect(wt)}
            className="flex-1 min-h-[38px] rounded-xl flex items-center justify-center gap-1 transition-all active:scale-95 touch-manipulation"
            style={{
              background: selected ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
              color: selected ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
              border: `2px solid ${error && !selected ? 'var(--theme-status-warning)' : selected ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
              boxShadow: selected ? 'none' : 'var(--theme-shadow-card)',
            }}
          >
            <span className="text-sm font-bold">{wt}</span>
            {selected && <CheckCircle className="w-3 h-3" />}
          </button>
        )
      })}
    </div>
  )
}
