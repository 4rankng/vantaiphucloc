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
  /** Optional label shown to the right of the navigator */
  rightLabel?: React.ReactNode
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function MonthNavigator({
  year,
  month,
  onPrev,
  onNext,
  periodStart,
  periodEnd,
  rightLabel,
}: MonthNavigatorProps) {
  const mm = String(month).padStart(2, '0')

  const rangeLabel =
    periodStart && periodEnd
      ? `${formatDDMM(periodStart)} → ${formatDDMM(periodEnd)}`
      : (() => {
          const lastDay = getDaysInMonth(year, month)
          return `01/${mm} → ${String(lastDay).padStart(2, '0')}/${mm}`
        })()

  return (
    <div className="flex items-center gap-3">
      {/* Navigator: chevron · title+range · chevron — tightly grouped */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onPrev}
          className="w-7 h-7 flex items-center justify-center rounded-md touch-manipulation transition-opacity hover:opacity-60 active:scale-90"
          style={{ color: 'var(--theme-text-secondary)' }}
          aria-label="Tháng trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-0">
          <span
            className="text-sm font-bold tabular-nums leading-tight whitespace-nowrap"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {periodStart && periodEnd
              ? `${formatDDMM(periodStart)} → ${formatDDMM(periodEnd)}`
              : `Tháng ${mm}/${year}`}
          </span>
          {periodStart && periodEnd ? null : (
            <span className="typo-meta tabular-nums whitespace-nowrap leading-tight">
              {rangeLabel}
            </span>
          )}
        </div>

        <button
          onClick={onNext}
          className="w-7 h-7 flex items-center justify-center rounded-md touch-manipulation transition-opacity hover:opacity-60 active:scale-90"
          style={{ color: 'var(--theme-text-secondary)' }}
          aria-label="Tháng sau"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Optional right label */}
      {rightLabel != null && (
        <span
          className="text-xs whitespace-nowrap"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          {rightLabel}
        </span>
      )}
    </div>
  )
}
