import { useState, useEffect, useCallback } from 'react'
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface FilterChip {
  key: string
  label: string
  active?: boolean
  onClick?: () => void
}

interface SearchBarProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  debounceMs?: number
  filters?: FilterChip[]
  onSortToggle?: () => void
  sortActive?: boolean
  className?: string
}

export function SearchBar({
  placeholder = 'Tìm kiếm...',
  value: controlledValue,
  onChange,
  onSearch,
  debounceMs = 300,
  filters = [],
  onSortToggle,
  sortActive,
  className,
}: SearchBarProps) {
  const [internal, setInternal] = useState(controlledValue ?? '')
  const value = controlledValue ?? internal

  useEffect(() => {
    const timer = setTimeout(() => onSearch?.(value), debounceMs)
    return () => clearTimeout(timer)
  }, [value, debounceMs, onSearch])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setInternal(v)
      onChange?.(v)
    },
    [onChange],
  )

  const clear = useCallback(() => {
    setInternal('')
    onChange?.('')
    onSearch?.('')
  }, [onChange, onSearch])

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)] pointer-events-none" />
          <Input
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            className="pl-9 pr-8 h-10"
          />
          {value && (
            <button onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--theme-bg-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-secondary)]">
              <X size={14} className="text-[var(--theme-text-muted)]" />
            </button>
          )}
        </div>
        {onSortToggle && (
          <Button
            variant={sortActive ? 'default' : 'outline'}
            size="icon"
            onClick={onSortToggle}
            className="shrink-0"
          >
            <ArrowUpDown size={16} />
          </Button>
        )}
      </div>
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={f.onClick}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-secondary)]',
                f.active
                  ? 'bg-[var(--theme-brand-primary)] text-[var(--theme-text-on-brand)]'
                  : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
