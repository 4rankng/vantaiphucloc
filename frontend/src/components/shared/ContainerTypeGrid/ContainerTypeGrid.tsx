import { useState, useRef, useEffect } from 'react'
import { CheckCircle, Plus } from 'lucide-react'
import { WORK_TYPES, WORK_TYPE_LABELS, type WorkType } from '@/data/domain'
import { hapticTap } from '@/lib/haptic'
import { playTick } from '@/lib/sound'

interface ContainerTypeGridProps {
  value: WorkType
  onChange: (type: WorkType) => void
  error?: boolean
  /** 'row' = single row (default), 'grid2x2' = 2×2 grid for container types */
  layout?: 'row' | 'grid2x2'
}

export function ContainerTypeGrid({ value, onChange, error, layout = 'row' }: ContainerTypeGridProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showCustom && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showCustom])

  const handleSelect = (wt: WorkType) => {
    if (wt === value) return
    hapticTap()
    playTick()
    onChange(wt)
    setShowCustom(false)
  }

  const handleCustomConfirm = () => {
    const trimmed = customValue.trim()
    if (trimmed) {
      hapticTap()
      playTick()
      onChange(trimmed as WorkType)
      setCustomValue('')
      setShowCustom(false)
    }
  }

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCustomConfirm()
    }
    if (e.key === 'Escape') {
      setShowCustom(false)
      setCustomValue('')
    }
  }

  // Check if current value is a custom (not in predefined list)
  const isCustomValue = value !== '' && !WORK_TYPES.includes(value as WorkType)

  return (
    <div className="space-y-2">
      <div className={layout === 'grid2x2' ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2'}>
        {WORK_TYPES.map(wt => {
          const selected = value === wt
          return (
            <button
              key={wt}
              onClick={() => handleSelect(wt)}
              className="min-h-[44px] rounded-xl flex items-center justify-center gap-1 transition-all active:translate-y-[1px] touch-manipulation"
              style={{
                background: selected ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                color: selected ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                border: `2px solid ${error && !selected ? 'var(--theme-status-warning)' : selected ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
                boxShadow: selected ? 'none' : 'var(--theme-shadow-card)',
                padding: '0 10px',
                flex: layout === 'grid2x2' ? undefined : '0 0 auto',
              }}
            >
              <span className="text-xs font-bold whitespace-nowrap">{WORK_TYPE_LABELS[wt] ?? wt}</span>
              {selected && <CheckCircle className="w-3 h-3 shrink-0" />}
            </button>
          )
        })}

        {/* Custom value button */}
        {!showCustom && (
          <button
            onClick={() => setShowCustom(true)}
            className="min-h-[44px] rounded-xl flex items-center justify-center gap-1 transition-all active:translate-y-[1px] touch-manipulation"
            style={{
              background: isCustomValue ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
              color: isCustomValue ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)',
              border: `2px solid ${isCustomValue ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
              boxShadow: isCustomValue ? 'none' : 'var(--theme-shadow-card)',
              padding: '0 10px',
            }}
          >
            <Plus className="w-3 h-3" />
            <span className="text-xs font-bold">{isCustomValue ? value : 'Khác'}</span>
            {isCustomValue && <CheckCircle className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Custom input field */}
      {showCustom && (
        <input
          ref={inputRef}
          value={customValue}
          onChange={e => setCustomValue(e.target.value)}
          onKeyDown={handleCustomKeyDown}
          onBlur={handleCustomConfirm}
          placeholder="Nhập tác nghiệp..."
          className="w-full h-11 rounded-xl px-3.5 text-sm"
          style={{
            background: 'var(--theme-bg-tertiary)',
            border: '1.5px solid var(--theme-brand-primary)',
            color: 'var(--theme-text-primary)',
          }}
        />
      )}
    </div>
  )
}
