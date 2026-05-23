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

  const primaryLabel = `Tháng ${mm}/${year}`

  const rangeLabel =
    periodStart && periodEnd
      ? `${formatDDMM(periodStart)} → ${formatDDMM(periodEnd)}`
      : (() => {
          const lastDay = getDaysInMonth(year, month)
          return `01/${mm} → ${String(lastDay).padStart(2, '0')}/${mm}`
        })()

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-1"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r)',
          padding: '4px 6px',
        }}
      >
        <button
          type="button"
          onClick={onPrev}
          className="nepo-month-nav-btn"
          aria-label="Tháng trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center px-2.5 min-w-0">
          {/* Body font — navigational label, not code output */}
          <span
            className="leading-tight whitespace-nowrap"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.015em',
            }}
          >
            {primaryLabel}
          </span>
          {rangeLabel && (
            <span
              className="leading-tight whitespace-nowrap tabular-nums"
              style={{
                fontSize: '10.5px',
                color: 'var(--ink-3)',
                letterSpacing: '0.01em',   /* slight tracking helps short date ranges read clearly */
              }}
            >
              {rangeLabel}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onNext}
          className="nepo-month-nav-btn"
          aria-label="Tháng sau"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {rightLabel != null && (
        <span
          className="text-xs whitespace-nowrap"
          style={{ color: 'var(--ink-3)' }}
        >
          {rightLabel}
        </span>
      )}
    </div>
  )
}
