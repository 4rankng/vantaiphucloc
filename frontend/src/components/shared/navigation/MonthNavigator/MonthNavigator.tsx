import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDDMM } from '@/lib/salaryPeriod'
import { cn } from '@/lib/utils'

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
  className?: string
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
  className,
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
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <div
        className="grid w-full min-w-[13.5rem] grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-1"
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

        <div className="flex min-w-0 flex-col items-center px-2">
          {/* Body font — navigational label, not code output */}
          <span
            className="max-w-full truncate leading-tight"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--ink)',
            }}
          >
            {primaryLabel}
          </span>
          {rangeLabel && (
            <span
              className="max-w-full truncate leading-tight tabular-nums"
              style={{
                fontSize: '10.5px',
                color: 'var(--ink-3)',
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
