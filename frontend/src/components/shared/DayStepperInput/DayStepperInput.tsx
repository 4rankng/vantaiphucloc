import { useState, useCallback } from 'react'
import { Minus, Plus } from 'lucide-react'
import { InfoTip } from '@/components/shared/InfoTip'

interface DayStepperInputProps {
  value: number
  onChange: (v: number) => void
  label: string
  hint?: string
}

function wrap(n: number): number {
  if (n < 1) return 31
  if (n > 31) return 1
  return n
}

export function DayStepperInput({ value, onChange, label, hint }: DayStepperInputProps) {
  const [draft, setDraft] = useState<string | null>(null)

  const handleDecrement = useCallback(() => onChange(wrap(value - 1)), [value, onChange])
  const handleIncrement = useCallback(() => onChange(wrap(value + 1)), [value, onChange])
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value), [])
  const handleBlur = useCallback(() => {
    if (draft === null) return
    const parsed = parseInt(draft, 10)
    const safe = isNaN(parsed) || draft.trim() === '' ? value : Math.min(31, Math.max(1, parsed))
    setDraft(null)
    onChange(safe)
  }, [draft, value, onChange])

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
        {label}
        {hint && <InfoTip text={hint} />}
      </label>
      <div
        className="flex items-center rounded-lg border overflow-hidden"
        style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-border-default)' }}
      >
        <button
          type="button"
          aria-label="Giảm ngày"
          onClick={handleDecrement}
          className="flex items-center justify-center px-2.5 py-2 transition-colors hover:bg-[var(--theme-bg-tertiary)]"
          style={{ color: 'var(--theme-text-secondary)', border: 'none', cursor: 'pointer', minHeight: '44px' }}
        >
          <Minus size={14} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={draft ?? String(value)}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-10 text-center text-sm font-semibold bg-transparent outline-none py-2"
          style={{ color: 'var(--theme-text-primary)' }}
        />
        <button
          type="button"
          aria-label="Tăng ngày"
          onClick={handleIncrement}
          className="flex items-center justify-center px-2.5 py-2 transition-colors hover:bg-[var(--theme-bg-tertiary)]"
          style={{ color: 'var(--theme-text-secondary)', border: 'none', cursor: 'pointer', minHeight: '44px' }}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}
