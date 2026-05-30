import { useState, useRef, useCallback, useEffect, useId } from 'react'
import { Clock, Check } from 'lucide-react'

interface RecentValuesInputProps {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  autoCapitalize?: string
}

/**
 * Text input with a polished recent-values dropdown.
 *
 * - On focus: shows filtered suggestions below the input
 * - On type: narrows suggestions by case-insensitive substring match
 * - On click/Enter suggestion: fills input and closes dropdown
 * - Arrow Up/Down: keyboard navigation through suggestions
 * - Escape: closes dropdown
 */
export function RecentValuesInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  style,
  autoCapitalize,
}: RecentValuesInputProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const listboxId = useId()

  const filtered = suggestions.filter(s =>
    !value || s.toLowerCase().includes(value.toLowerCase())
  )

  const showDropdown = open && filtered.length > 0

  // Reset active index whenever the list changes
  useEffect(() => {
    setActiveIndex(-1)
  }, [filtered.length, open])

  const handleFocus = useCallback(() => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setOpen(true)
  }, [])

  const handleBlur = useCallback(() => {
    blurTimer.current = setTimeout(() => setOpen(false), 150)
  }, [])

  const selectSuggestion = useCallback((s: string) => {
    onChange(s)
    setOpen(false)
    setActiveIndex(-1)
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, -1))
        break
      case 'Enter':
        if (activeIndex >= 0 && filtered[activeIndex]) {
          e.preventDefault()
          selectSuggestion(filtered[activeIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
        break
    }
  }, [showDropdown, activeIndex, filtered, selectSuggestion])

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current)
    }
  }, [])

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        style={style}
        autoCapitalize={autoCapitalize}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls={showDropdown ? listboxId : undefined}
        aria-activedescendant={
          showDropdown && activeIndex >= 0
            ? `${listboxId}-opt-${activeIndex}`
            : undefined
        }
      />

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden"
          style={{
            background: 'var(--theme-bg-elevated, var(--theme-bg-secondary))',
            border: '1px solid var(--theme-border-default)',
            borderRadius: 14,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            maxHeight: 240,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            // Subtle enter animation
            animation: 'recentDropdownIn 120ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseDown={e => e.preventDefault()} // keep input focused
        >
          {/* Header */}
          <div
            className="flex items-center gap-1.5 px-3 py-2"
            style={{
              borderBottom: '1px solid var(--theme-border-default)',
            }}
          >
            <Clock
              className="w-3 h-3 shrink-0"
              style={{ color: 'var(--theme-text-muted)' }}
            />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.1em]"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              Đã dùng gần đây
            </span>
            <span
              className="ml-auto text-[10px] font-semibold tabular-nums"
              style={{ color: 'var(--theme-text-muted)', opacity: 0.6 }}
            >
              {filtered.length}
            </span>
          </div>

          {/* Suggestion rows */}
          {filtered.map((suggestion, idx) => {
            const isActive = idx === activeIndex
            const isSelected = suggestion === value
            return (
              <button
                key={suggestion}
                id={`${listboxId}-opt-${idx}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                className="w-full text-left px-3 flex items-center gap-2.5 touch-manipulation transition-colors"
                style={{
                  minHeight: 44,
                  background: isActive
                    ? 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)'
                    : isSelected
                    ? 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)'
                    : 'transparent',
                  borderBottom: idx < filtered.length - 1
                    ? '1px solid color-mix(in srgb, var(--theme-border-default) 60%, transparent)'
                    : 'none',
                }}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                {/* Clock icon per row */}
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    background: isActive || isSelected
                      ? 'color-mix(in srgb, var(--theme-brand-primary) 15%, transparent)'
                      : 'color-mix(in srgb, var(--theme-border-default) 60%, transparent)',
                  }}
                >
                  <Clock
                    className="w-3 h-3"
                    style={{
                      color: isActive || isSelected
                        ? 'var(--theme-brand-primary)'
                        : 'var(--theme-text-muted)',
                    }}
                  />
                </span>

                {/* Label — highlight matching substring */}
                <span
                  className="flex-1 text-sm font-medium truncate"
                  style={{ color: 'var(--theme-text-primary)' }}
                >
                  <HighlightMatch text={suggestion} query={value} />
                </span>

                {/* Checkmark for selected */}
                {isSelected && (
                  <Check
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--theme-brand-primary)' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Keyframe for dropdown enter */}
      <style>{`
        @keyframes recentDropdownIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  )
}

/** Highlight the matching query substring within text. */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: 'var(--theme-brand-primary)', fontWeight: 700 }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  )
}
