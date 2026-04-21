'use client'

import { cn } from '@/lib/utils'

type Range = 'today' | 'week' | 'month' | 'quarter' | 'year'

interface TimeRangePickerProps {
  value: Range
  onChange: (range: Range) => void
  ranges?: Range[]
  className?: string
}

const RANGE_LABELS: Record<Range, string> = {
  today: 'Hôm nay',
  week: 'Tuần',
  month: 'Tháng',
  quarter: 'Quý',
  year: 'Năm',
}

export function TimeRangePicker({ value, onChange, ranges = ['today', 'week', 'month'], className }: TimeRangePickerProps) {
  return (
    <div className={cn(
      'inline-flex items-center rounded-lg bg-[var(--theme-bg-tertiary)] p-0.5',
      className,
    )}>
      {ranges.map(range => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
            value === range
              ? 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] shadow-sm'
              : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]',
          )}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  )
}

export type { Range }
