import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PeriodSwitcherProps {
  label: string
  sublabel?: string
  onPrev: () => void
  onNext: () => void
}

export function PeriodSwitcher({ label, sublabel, onPrev, onNext }: PeriodSwitcherProps) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl border p-2"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <button
        onClick={onPrev}
        className="flex h-9 w-9 items-center justify-center rounded-lg transition-[var(--transition-smooth)] active:scale-90"
        style={{ color: 'var(--theme-text-primary)', touchAction: 'manipulation' }}
        aria-label="Tháng trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="text-center">
        <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
          {label}
        </p>
        {sublabel && (
          <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
            {sublabel}
          </p>
        )}
      </div>

      <button
        onClick={onNext}
        className="flex h-9 w-9 items-center justify-center rounded-lg transition-[var(--transition-smooth)] active:scale-90"
        style={{ color: 'var(--theme-text-primary)', touchAction: 'manipulation' }}
        aria-label="Tháng sau"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
