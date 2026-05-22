import { useState, useRef, useCallback } from 'react'
import { ChevronDown, Search, Check, Plus } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover/Popover'

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
}

export function InlineSelect({ placeholder, value, options, onChange, onInputChange, onCreateNew, createNewLabel = 'Tạo mới', className, style }: InlineSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase()))
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
          className={`w-full flex items-center justify-between h-11 rounded-xl px-4 text-sm touch-manipulation ${className ?? ''}`}
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
            color: selected || value ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
            ...style,
          }}
        >
          <span className={`${selected || value ? 'font-medium' : ''}`}>
            {selected?.label ?? (value || placeholder)}
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
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
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
          <input
            ref={searchRef}
            value={query}
            onChange={handleQueryChange}
            placeholder="Tìm kiếm..."
            className="flex-1 h-10 bg-transparent text-sm outline-none"
            style={{ color: 'var(--theme-text-primary)' }}
          />
        </div>

        <div
          className="max-h-64 overflow-y-auto overscroll-contain"
          onWheel={e => e.stopPropagation()}
        >
          {filtered.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: 'var(--theme-text-muted)' }}>
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
                  className="w-full text-left flex items-center justify-between px-4 py-3 transition-colors touch-manipulation"
                  style={{
                    background: isSelected ? 'var(--theme-brand-primary-light)' : 'transparent',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>
                      {opt.label}
                    </p>
                    {opt.sublabel && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-muted)' }}>
                        {opt.sublabel}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-brand-primary)' }} />
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
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors touch-manipulation"
              style={{ color: 'var(--theme-brand-primary)' }}
            >
              <Plus className="w-4 h-4 shrink-0" />
              {createNewLabel}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
