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
    <div className={`flex gap-2 overflow-x-auto scrollbar-none py-1 ${className ?? ''}`}>
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] touch-manipulation"
            style={{
              background: active ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
              color: active ? 'var(--theme-text-on-brand)' : 'var(--theme-text-secondary)',
              boxShadow: active ? '0 2px 8px rgba(0, 150, 62, 0.25)' : 'none',
            }}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span 
                className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  background: active ? 'rgba(255,255,255,0.2)' : 'var(--theme-bg-secondary)',
                  color: active ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)',
                }}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
