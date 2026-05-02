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
  /** Optional label shown on the right side (e.g. "8 lệnh trong tháng") */
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
    <div
      className="flex items-center justify-between rounded-2xl px-3 py-2"
      style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
    >
      {/* Left chevron */}
      <button
        onClick={onPrev}
        className="w-9 h-9 flex items-center justify-center rounded-lg touch-manipulation transition-colors active:scale-90 shrink-0"
        style={{ color: 'var(--theme-text-secondary)' }}
        aria-label="Tháng trước"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Center: title + range */}
      <div className="flex flex-col items-center gap-0.5 flex-1">
        <span
          className="text-base font-bold tabular-nums font-display leading-tight whitespace-nowrap"
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

      {/* Right chevron */}
      <button
        onClick={onNext}
        className="w-9 h-9 flex items-center justify-center rounded-lg touch-manipulation transition-colors active:scale-90 shrink-0"
        style={{ color: 'var(--theme-text-secondary)' }}
        aria-label="Tháng sau"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Optional right label */}
      {rightLabel != null && (
        <span
          className="text-xs whitespace-nowrap pl-2 pr-1 shrink-0"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          {rightLabel}
        </span>
      )}
    </div>
  )
}
