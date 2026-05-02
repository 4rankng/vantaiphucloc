import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDDMM } from '@/utils/salaryPeriod'

interface MonthNavigatorProps {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
  /** When provided, show salary period range instead of calendar month range */
  periodStart?: Date
  periodEnd?: Date
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function MonthNavigator({ year, month, onPrev, onNext, periodStart, periodEnd }: MonthNavigatorProps) {
  const mm = String(month).padStart(2, '0')

  const rangeLabel = periodStart && periodEnd
    ? `${formatDDMM(periodStart)} → ${formatDDMM(periodEnd)}`
    : (() => {
        const lastDay = getDaysInMonth(year, month)
        return `01/${mm} → ${String(lastDay).padStart(2, '0')}/${mm}`
      })()

  return (
    <div className="flex items-center justify-center gap-2 py-2 pointer-events-none">
      <button
        onClick={onPrev}
        className="w-10 h-10 flex items-center justify-center rounded-lg touch-manipulation transition-colors active:scale-90 pointer-events-auto"
        style={{ color: 'var(--theme-text-secondary)' }}
        aria-label="Tháng trước"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex flex-col items-center gap-0.5">
        <span
          className="text-sm font-bold tabular-nums font-display leading-tight whitespace-nowrap"
          style={{ color: 'var(--theme-text-primary)' }}
        >
          Tháng {mm}/{year}
        </span>
        <span
          className="text-xs tabular-nums whitespace-nowrap"
          style={{ color: 'var(--theme-text-secondary)' }}
        >
          {rangeLabel}
        </span>
      </div>

      <button
        onClick={onNext}
        className="w-10 h-10 flex items-center justify-center rounded-lg touch-manipulation transition-colors active:scale-90 pointer-events-auto"
        style={{ color: 'var(--theme-text-secondary)' }}
        aria-label="Tháng sau"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}
