import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { shiftISODate, formatISODate } from '@/utils/salaryPeriod'

interface DateNavigatorProps {
  /** ISO date string (YYYY-MM-DD) */
  value: string
  /** Called with new ISO date when shifted */
  onChange: (iso: string) => void
  /** Optional label text (default: "Ngày đi") */
  label?: string
  /** Optional: show "Trước: ~~date~~" hint when original differs */
  originalLabel?: string | null
  /** Compact variant — smaller padding, used in detail pages */
  compact?: boolean
}

/**
 * DateNavigator — left/right arrow date picker for mobile drivers.
 *
 * Shows date in DD/MM/YYYY format with chevron buttons to shift by one day.
 * All date math uses local timezone to avoid UTC offset bugs in GMT+7.
 */
export function DateNavigator({
  value,
  onChange,
  label = 'Ngày đi',
  originalLabel,
  compact = false,
}: DateNavigatorProps) {
  function shift(days: number) {
    onChange(shiftISODate(value, days))
  }

  return (
    <div
      className={`flex items-center gap-1 rounded-lg ${compact ? 'px-0 py-0' : 'px-3 py-2'}`}
      style={!compact ? {
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
      } : undefined}
    >
      <Calendar
        className="w-3.5 h-3.5 shrink-0"
        style={{ color: 'var(--theme-text-muted)' }}
      />
      <span
        className={`font-semibold mr-1 ${compact ? 'text-[10.5px] uppercase tracking-wider' : 'text-[11px]'}`}
        style={{ color: 'var(--theme-text-muted)' }}
      >
        {label}
      </span>

      <button
        type="button"
        onClick={() => shift(-1)}
        className="w-8 h-8 flex items-center justify-center rounded-lg touch-manipulation active:scale-95 transition-transform ml-auto"
        style={{
          background: 'var(--theme-bg-tertiary)',
          border: '1px solid var(--theme-border-default)',
          color: 'var(--theme-text-primary)',
        }}
        aria-label="Ngày trước"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span
        className="text-[15px] font-bold tabular-nums min-w-[90px] text-center"
        style={{ color: 'var(--theme-text-primary)' }}
      >
        {formatISODate(value)}
      </span>

      <button
        type="button"
        onClick={() => shift(1)}
        className="w-8 h-8 flex items-center justify-center rounded-lg touch-manipulation active:scale-95 transition-transform"
        style={{
          background: 'var(--theme-bg-tertiary)',
          border: '1px solid var(--theme-border-default)',
          color: 'var(--theme-text-primary)',
        }}
        aria-label="Ngày sau"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {originalLabel && (
        <span
          className="text-[11px] font-medium ml-1"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          <span style={{ opacity: 0.7 }}>Trước:</span>{' '}
          <span className="line-through" style={{ opacity: 0.85 }}>{originalLabel}</span>
        </span>
      )}
    </div>
  )
}
