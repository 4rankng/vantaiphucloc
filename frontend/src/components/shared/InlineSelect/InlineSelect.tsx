import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
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
}

export function InlineSelect({ placeholder, value, options, onChange }: InlineSelectProps) {
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

  useEffect(() => {
    if (open) {
      setQuery('')
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between h-11 rounded-xl px-4 text-sm touch-manipulation"
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
            color: selected ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
          }}
        >
          <span className={`truncate ${selected ? 'font-medium' : ''}`}>
            {selected?.label ?? placeholder}
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
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm kiếm..."
            className="flex-1 h-10 bg-transparent text-sm outline-none"
            style={{ color: 'var(--theme-text-primary)' }}
          />
        </div>

        <div className="max-h-64 overflow-y-auto overscroll-contain">
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
      </PopoverContent>
    </Popover>
  )
}
