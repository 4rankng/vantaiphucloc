import { useState, useCallback, type ReactNode } from 'react'
import { Search, X, ChevronDown, Calendar } from 'lucide-react'

export interface FilterOption {
  key: string
  label: string
  color?: string
}

export interface DateRangeValue {
  from: string
  to: string
}

export interface FilterToolbarProps {
  /** Search input value */
  search?: string
  /** Search input change handler */
  onSearchChange?: (value: string) => void
  /** Placeholder for search input */
  searchPlaceholder?: string
  /** Status filter options */
  statusOptions?: FilterOption[]
  /** Currently selected status */
  selectedStatus?: string
  /** Status change handler */
  onStatusChange?: (status: string) => void
  /** Date range value */
  dateRange?: DateRangeValue
  /** Date range change handler */
  onDateRangeChange?: (range: DateRangeValue) => void
  /** Show date range picker */
  showDateRange?: boolean
  /** Additional filter controls */
  extraFilters?: ReactNode
  /** Active filter count (for badge) */
  activeFilterCount?: number
  /** Clear all filters handler */
  onClearFilters?: () => void
  /** Show filter count badge */
  showFilterBadge?: boolean
  /** Action button rendered at end of toolbar row */
  extraAction?: ReactNode
}

export function FilterToolbar({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  statusOptions = [],
  selectedStatus = 'ALL',
  onStatusChange,
  dateRange,
  onDateRangeChange,
  showDateRange = false,
  extraFilters,
  extraAction,
}: FilterToolbarProps) {
  const [dateExpanded, setDateExpanded] = useState(false)

  const handleStatusClick = useCallback(
    (key: string) => {
      onStatusChange?.(key)
    },
    [onStatusChange]
  )

  return (
    <div className="space-y-3">
      {/* Main toolbar row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search input */}
        {onSearchChange && (
          <div className="relative flex-1 min-w-[160px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
              style={{ color: 'var(--theme-text-muted)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-10 rounded-xl pl-10 pr-10 text-sm transition-all focus:outline-none focus:ring-2"
              style={{
                background: 'var(--theme-bg-secondary)',
                border: '1px solid var(--theme-border-default)',
                color: 'var(--theme-text-primary)',
              }}
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full transition-colors hover:opacity-70"
                style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Status filter tabs — inline with search */}
        {statusOptions.length > 0 && onStatusChange && (
          <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {statusOptions.map(({ key, label, color }) => {
              const isActive = selectedStatus === key
              return (
                <button
                  key={key}
                  onClick={() => handleStatusClick(key)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all touch-manipulation"
                  style={{
                    background: isActive
                      ? color ?? 'var(--theme-brand-primary)'
                      : 'var(--theme-bg-secondary)',
                    color: isActive ? '#fff' : color ?? 'var(--theme-text-muted)',
                    border: `1px solid ${isActive ? 'transparent' : 'var(--theme-border-default)'}`,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* Date range toggle (desktop) */}
        {showDateRange && onDateRangeChange && (
          <button
            onClick={() => setDateExpanded(!dateExpanded)}
            className="hidden lg:flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: dateRange?.from || dateRange?.to ? 'color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)' : 'var(--theme-bg-secondary)',
              border: '1px solid var(--theme-border-default)',
              color: dateRange?.from || dateRange?.to ? 'var(--theme-brand-primary)' : 'var(--theme-text-primary)',
            }}
          >
            <Calendar className="h-4 w-4" />
            {dateRange?.from && dateRange?.to
              ? `${dateRange.from} - ${dateRange.to}`
              : 'Chọn ngày'}
            <ChevronDown className={`h-4 w-4 transition-transform ${dateExpanded ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Extra filters slot */}
        {extraFilters}

        {extraAction && (
          <div className="ml-auto">{extraAction}</div>
        )}

      </div>

      {/* Date range expanded row */}
      {showDateRange && dateExpanded && onDateRangeChange && (
        <div
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>
            Từ:
          </span>
          <input
            type="date"
            value={dateRange?.from ?? ''}
            onChange={(e) =>
              onDateRangeChange({ from: e.target.value, to: dateRange?.to ?? '' })
            }
            className="h-9 rounded-lg px-3 text-sm"
            style={{
              background: 'var(--theme-bg-tertiary)',
              border: '1px solid var(--theme-border-default)',
              color: 'var(--theme-text-primary)',
            }}
          />
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>
            Đến:
          </span>
          <input
            type="date"
            value={dateRange?.to ?? ''}
            onChange={(e) =>
              onDateRangeChange({ from: dateRange?.from ?? '', to: e.target.value })
            }
            className="h-9 rounded-lg px-3 text-sm"
            style={{
              background: 'var(--theme-bg-tertiary)',
              border: '1px solid var(--theme-border-default)',
              color: 'var(--theme-text-primary)',
            }}
          />
        </div>
      )}

    </div>
  )
}
