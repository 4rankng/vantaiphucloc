interface FilterPillsOption<T extends string> {
  value: T
  label: string
  count?: number
}

interface FilterPillsProps<T extends string> {
  options: FilterPillsOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function FilterPills<T extends string>({ options, value, onChange, className }: FilterPillsProps<T>) {
  return (
    <div className={`flex gap-2 overflow-x-auto scrollbar-none pb-1 ${className ?? ''}`}>
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all touch-manipulation"
            style={{
              background: active ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
              color: active ? 'var(--theme-text-on-brand)' : 'var(--theme-text-secondary)',
              border: `1px solid ${active ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
            }}
          >
            {opt.label}{opt.count !== undefined ? ` (${opt.count})` : ''}
          </button>
        )
      })}
    </div>
  )
}
