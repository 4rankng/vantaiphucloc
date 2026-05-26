import { useState, useRef, useCallback } from 'react'
import { ChevronDown, Search, Check, Plus } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover/Popover'
import { normalizeVietnamese } from '@/lib/search-utils'

export interface InlineSelectOption {
  value: string
  label: string
  sublabel?: string
}

interface InlineSelectProps {
  label?: string
  placeholder: string
  value: string
  options: InlineSelectOption[]
  onChange: (value: string) => void
  /** Fires when user types in the search input */
  onInputChange?: (value: string) => void
  /** When provided, shows a "+ Tạo mới" footer button in the dropdown */
  onCreateNew?: () => void
  createNewLabel?: string
  className?: string
  style?: React.CSSProperties
  compact?: boolean
}

export function InlineSelect({
  placeholder,
  value,
  options,
  onChange,
  onInputChange,
  onCreateNew,
  createNewLabel = 'Tạo mới',
  className,
  style,
  compact = false,
}: InlineSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const normalizedQuery = normalizeVietnamese(query.trim())
  const filtered = normalizedQuery
    ? options.filter(o =>
        normalizeVietnamese(o.label).includes(normalizedQuery) ||
        (o.sublabel && normalizeVietnamese(o.sublabel).includes(normalizedQuery))
      )
    : options

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setQuery('')
      onInputChange?.('')
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [onInputChange])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    onInputChange?.(val)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-full flex items-center justify-between touch-manipulation overflow-hidden ${className ?? ''}`}
          style={{
            height: compact ? 30 : 44,
            padding: compact ? '0 10px' : '0 16px',
            borderRadius: compact ? 6 : 12,
            fontSize: compact ? 12 : 14,
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
            color: selected || value ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
            ...style,
          }}
        >
          <span className={`truncate min-w-0 ${selected || value ? 'font-medium' : ''}`}>
            {selected?.label ?? (value || placeholder)}
          </span>
          <ChevronDown className={`${compact ? 'w-3.5 h-3.5 ml-1' : 'w-4 h-4 ml-2'} shrink-0`} style={{ color: 'var(--theme-text-muted)' }} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        className="p-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div
          className="flex items-center gap-2 px-3 border-b"
          style={{ borderColor: 'var(--theme-border-default)' }}
        >
          <Search className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0`} style={{ color: 'var(--theme-text-muted)' }} />
          <input
            ref={searchRef}
            value={query}
            onChange={handleQueryChange}
            placeholder="Tìm kiếm..."
            className={`flex-1 bg-transparent outline-none ${compact ? 'h-8 text-xs' : 'h-10 text-sm'}`}
            style={{ color: 'var(--theme-text-primary)' }}
          />
        </div>

        <div
          className="max-h-64 overflow-y-auto overscroll-contain"
          onWheel={e => e.stopPropagation()}
        >
          {filtered.length === 0 ? (
            <p className={`${compact ? 'text-[11px] py-4' : 'text-xs py-6'} text-center`} style={{ color: 'var(--theme-text-muted)' }}>
              Không tìm thấy kết quả
            </p>
          ) : (
            filtered.map(opt => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={`w-full text-left flex items-center justify-between transition-colors touch-manipulation ${
                    compact ? 'px-2.5 py-1.5' : 'px-4 py-3'
                  }`}
                  style={{
                    background: isSelected ? 'var(--theme-brand-primary-light)' : 'transparent',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium truncate`} style={{ color: 'var(--theme-text-primary)' }}>
                      {opt.label}
                    </p>
                    {opt.sublabel && (
                      <p className={`${compact ? 'text-[10px]' : 'text-xs'} mt-0.5 truncate`} style={{ color: 'var(--theme-text-muted)' }}>
                        {opt.sublabel}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <Check className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0 ml-2`} style={{ color: 'var(--theme-brand-primary)' }} />
                  )}
                </button>
              )
            })
          )}
        </div>

        {onCreateNew && (
          <div className="border-t" style={{ borderColor: 'var(--theme-border-default)' }}>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onCreateNew()
              }}
              className={`w-full flex items-center gap-2 font-semibold transition-colors touch-manipulation ${
                compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
              }`}
              style={{ color: 'var(--theme-brand-primary)' }}
            >
              <Plus className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0`} />
              {createNewLabel}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
