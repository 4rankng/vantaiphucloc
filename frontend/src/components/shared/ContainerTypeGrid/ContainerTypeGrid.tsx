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
    <div className="grid grid-cols-2 gap-3">
      {WORK_TYPES.map(wt => {
        const selected = value === wt
        return (
          <button
            key={wt}
            onClick={() => handleSelect(wt)}
            className="min-h-[56px] rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 touch-manipulation"
            style={{
              background: selected ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
              color: selected ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
              border: `2px solid ${error && !selected ? 'var(--theme-status-warning)' : selected ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
            }}
          >
            <span className="text-lg font-bold">{wt}</span>
            {selected && <CheckCircle className="w-4 h-4" />}
          </button>
        )
      })}
    </div>
  )
}
