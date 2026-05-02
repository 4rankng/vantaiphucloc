import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthNavigatorProps {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
}

export function MonthNavigator({ year, month, onPrev, onNext }: MonthNavigatorProps) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl border px-2 py-2"
      style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
    >
      <button
        onClick={onPrev}
        className="w-8 h-8 flex items-center justify-center rounded-lg touch-manipulation transition-colors active:scale-90"
        style={{ color: 'var(--theme-brand-primary)' }}
        aria-label="Tháng trước"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span className="text-sm font-bold tabular-nums px-3 font-display" style={{ color: 'var(--theme-text-primary)' }}>
        Tháng {month} / {year}
      </span>

      <button
        onClick={onNext}
        className="w-8 h-8 flex items-center justify-center rounded-lg touch-manipulation transition-colors active:scale-90"
        style={{ color: 'var(--theme-brand-primary)' }}
        aria-label="Tháng sau"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
