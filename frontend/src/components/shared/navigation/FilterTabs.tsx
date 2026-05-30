import React from 'react'

export interface FilterTabItem<T extends string> {
  value: T
  label: string
}

export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  counts,
}: {
  tabs: FilterTabItem<T>[]
  value: T
  onChange: (v: T) => void
  counts?: Record<T, number>
}) {
  return (
    <div
      className="flex items-center"
      style={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-sm, 8px)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {tabs.map((tab, i) => {
        const active = value === tab.value
        const count = counts?.[tab.value]
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 transition-colors"
            style={{
              background: active ? 'var(--accent)' : 'var(--surface-2)',
              color: active ? 'var(--theme-text-on-brand)' : 'var(--ink-3)',
              borderRight: i < tabs.length - 1 ? '1px solid var(--line)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
            {count !== undefined && (
              <span
                className="tabular-nums text-[10.5px] font-bold px-1.5 py-0 rounded-full"
                style={{
                  background: active ? 'rgba(255,255,255,0.25)' : 'var(--surface-3)',
                  color: active ? 'var(--theme-text-on-brand)' : 'var(--ink-3)',
                  minWidth: 18,
                  textAlign: 'center',
                }}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
