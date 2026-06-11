import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toISODate, formatISODate, dayBefore, dayAfter } from '@/lib/salaryPeriod'

interface DayNavigatorProps {
  date: Date
  onChange: (date: Date) => void
  /** Optional max date (default: today) — prevents selecting future days */
  maxDate?: Date
}

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function stripTime(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function weekdayLabel(date: Date): string {
  const w = WEEKDAY_LABELS[date.getDay()]
  return w === 'CN' ? 'CN' : w.replace('T', '')
}

export function DayNavigator({ date, onChange, maxDate }: DayNavigatorProps) {
  const today = stripTime(new Date())
  const max = maxDate ? stripTime(maxDate) : today
  const dateInputRef = useRef<HTMLInputElement>(null)

  const selected = stripTime(date)
  const canGoNext = selected < max
  const isToday = isSameDay(selected, today)

  const handlePrev = () => onChange(dayBefore(selected))
  const handleNext = () => { if (canGoNext) onChange(dayAfter(selected)) }

  const handlePickDate = (iso: string) => {
    if (!iso) return
    const [y, m, d] = iso.split('-').map(Number)
    const picked = new Date(y, m - 1, d)
    onChange(picked > max ? max : picked)
  }

  const openPicker = () => {
    dateInputRef.current?.showPicker?.()
    dateInputRef.current?.focus()
  }

  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <div
        className="flex items-center gap-1"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
          borderRadius: '0.5rem',
          padding: '4px 6px',
        }}
      >
        <button
          type="button"
          onClick={handlePrev}
          className="w-9 h-9 flex items-center justify-center rounded-lg touch-manipulation active:scale-95 transition-transform"
          style={{ color: 'var(--theme-text-primary)' }}
          aria-label="Ngày trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={openPicker}
          className="flex flex-col items-center px-2.5 py-0.5 min-w-0 cursor-pointer rounded-md transition-colors"
          style={{ color: 'var(--theme-text-primary)' }}
          aria-label="Chọn ngày"
        >
          <span
            className="leading-tight whitespace-nowrap tabular-nums"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--theme-text-primary)',
              letterSpacing: '-0.015em',
            }}
          >
            {formatISODate(toISODate(selected))}
          </span>
          <span
            className="leading-tight whitespace-nowrap"
            style={{
              fontSize: '10.5px',
              color: isToday ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)',
              fontWeight: isToday ? 600 : 500,
              letterSpacing: '0.01em',
            }}
          >
            {isToday ? 'Hôm nay' : `Thứ ${weekdayLabel(selected)}`}
          </span>
        </button>

        <input
          ref={dateInputRef}
          type="date"
          value={toISODate(selected)}
          onChange={e => handlePickDate(e.target.value)}
          max={toISODate(max)}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />

        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          className="w-9 h-9 flex items-center justify-center rounded-lg touch-manipulation active:scale-95 transition-transform"
          style={{
            color: 'var(--theme-text-primary)',
            ...(!canGoNext ? { opacity: 0.35, cursor: 'not-allowed' } : {}),
          }}
          aria-label="Ngày sau"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
