import { useRef } from 'react'
import { Calendar, X } from 'lucide-react'

export interface InlineDatePickerProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  placeholder?: string
  style?: React.CSSProperties
  className?: string
}

export function InlineDatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Lọc theo ngày',
  style,
  className = '',
}: InlineDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleOpen = () => {
    inputRef.current?.showPicker?.()
    inputRef.current?.focus()
  }

  const formattedValue = value ? (() => {
    const [y, m, d] = value.split('-')
    return `${d}/${m}/${y}`
  })() : ''

  return (
    <div className={`relative ${className}`} style={{ width: style?.width ?? '100%' }}>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between touch-manipulation overflow-hidden"
        style={{
          height: 32,
          padding: '0 10px 0 10px',
          borderRadius: 12,
          fontSize: 12.5,
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
          color: value ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
          textAlign: 'left',
          ...style,
        }}
      >
        <span className={`truncate min-w-0 ${value ? 'font-medium' : ''}`}>
          {formattedValue || placeholder}
        </span>
        {value ? (
          <span className="w-4 h-4 shrink-0 ml-1" />
        ) : (
          <Calendar className="w-3.5 h-3.5 ml-1 shrink-0 text-[var(--theme-text-muted)]" />
        )}
      </button>

      <input
        ref={inputRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onChange('')
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center h-5 w-5 rounded-full hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
