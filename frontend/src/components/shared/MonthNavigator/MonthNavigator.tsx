import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthNavigatorProps {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
}

export function MonthNavigator({ year, month, onPrev, onNext }: MonthNavigatorProps) {
  const monthLabel = `Tháng ${month}/${year}`

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={onPrev}
        className="w-8 h-8 flex items-center justify-center rounded-full touch-manipulation"
        style={{ background: 'var(--theme-bg-secondary)' }}
      >
        <ChevronLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary)' }} />
      </button>
      <span className="text-sm font-bold min-w-[120px] text-center" style={{ color: 'var(--theme-text-primary)' }}>
        {monthLabel}
      </span>
      <button
        onClick={onNext}
        className="w-8 h-8 flex items-center justify-center rounded-full touch-manipulation"
        style={{ background: 'var(--theme-bg-secondary)' }}
      >
        <ChevronRight className="w-4 h-4" style={{ color: 'var(--theme-text-primary)' }} />
      </button>
    </div>
  )
}
