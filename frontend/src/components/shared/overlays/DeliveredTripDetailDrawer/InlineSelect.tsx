import { useState } from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover/Popover'
import { normalizeVietnamese } from '@/lib/search-utils'

export function InlineSelect({
  value,
  displayValue,
  options,
  onChange,
}: {
  value: string | number | null
  displayValue?: string | null
  options: { value: string | number; label: string }[]
  onChange: (value: string | number) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const unique = options.filter(
    (o, i, arr) =>
      arr.findIndex(
        (x) => String(x.value) === String(o.value) || x.label === o.label,
      ) === i,
  )
  const showSearch = unique.length > 6

  const filtered = showSearch
    ? unique.filter((o) => normalizeVietnamese(o.label).includes(normalizeVietnamese(search)))
    : unique

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch('') }}>
      <PopoverTrigger asChild>
        <button
          className="group inline-flex items-center justify-end gap-1.5 rounded-md px-2 py-1 -mx-2 text-right text-[13px] transition-colors max-w-full font-medium"
          style={{ background: 'transparent', color: displayValue ? 'var(--ink)' : 'var(--ink-4)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <span className={`truncate ${!displayValue ? 'italic font-normal' : ''}`}>{displayValue ?? 'chưa chọn'}</span>
          <svg className="shrink-0 opacity-40" width="12" height="12" viewBox="0 0 10 10">
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="p-0 min-w-[180px] max-w-[260px]">
        {showSearch && (
          <div className="px-2 pt-2 pb-1" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full text-[12px] px-2 py-1 rounded-md outline-none"
              style={{
                background: 'var(--theme-bg-tertiary)',
                color: 'var(--theme-text-primary)',
                border: 'none',
              }}
            />
          </div>
        )}
        <div className="py-1 max-h-72 overflow-y-auto custom-scrollbar pr-1">
          <button
            className="w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors"
            style={{ color: 'var(--theme-text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            onClick={() => { onChange(''); setOpen(false) }}
          >
            <span className="w-3" />
            <span className="italic">— bất kỳ —</span>
          </button>
          {filtered.map((o) => {
            const selected = String(o.value) === String(value)
            return (
              <button
                key={o.value}
                className="w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors"
                style={{ color: selected ? 'var(--theme-brand-primary)' : 'var(--theme-text-primary)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                onClick={() => { onChange(o.value); setOpen(false); setSearch('') }}
              >
                {selected
                  ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <span className="w-3" />
                }
                <span className="truncate">{o.label}</span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-[12px] text-center" style={{ color: 'var(--theme-text-muted)' }}>
              Không tìm thấy
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
