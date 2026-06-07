import { useState, useMemo } from 'react'
import { CheckCircle2, Search, X } from 'lucide-react'
import { normalizeVietnamese } from '@/lib/search-utils'

export function PickModal<T extends { id: number }>({
  open, title, items, selectedId, onSelect, onClose, renderLabel, searchKeys,
}: {
  open: boolean
  title: string
  items: T[]
  selectedId: number
  onSelect: (id: number) => void
  onClose: () => void
  renderLabel: (item: T) => React.ReactNode
  /** Optional: array of string keys to search on. If omitted, search is hidden. */
  searchKeys?: (item: T) => string
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!searchKeys || !query.trim()) return items
    const q = normalizeVietnamese(query)
    return items.filter(item => normalizeVietnamese(searchKeys(item)).includes(q))
  }, [items, query, searchKeys])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[199] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — full screen on mobile, centered sheet on desktop */}
      <div
        className="fixed inset-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[560px] lg:max-h-[80vh] lg:rounded-lg lg:shadow-2xl z-[200] flex flex-col"
        style={{ background: 'var(--theme-bg-primary)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--theme-border-light)' }}
        >
          <p className="type-h3" style={{ color: 'var(--theme-text-primary)' }}>
            {title}
            {items.length > 0 && (
              <span
                className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
              >
                {filtered.length}{query ? `/${items.length}` : ''}
              </span>
            )}
          </p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg touch-manipulation hover:opacity-70"
            style={{ color: 'var(--theme-text-muted)' }}
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar */}
        {searchKeys && (
          <div className="px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--theme-text-primary)' }}
              />
              {query && (
                <button onClick={() => setQuery('')} className="touch-manipulation">
                  <X className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                {query ? 'Không tìm thấy kết quả' : 'Không có dữ liệu'}
              </p>
              {query && (
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  Thử tìm với từ khóa khác
                </p>
              )}
            </div>
          ) : (
            filtered.map(item => {
              const isSelected = item.id === selectedId
              return (
                <button
                  key={item.id}
                  onClick={() => { onSelect(item.id); onClose(); setQuery('') }}
                  className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 touch-manipulation transition-colors hover:opacity-80"
                  style={{
                    background: isSelected ? 'var(--theme-brand-primary-light)' : 'transparent',
                    borderBottom: '1px solid var(--theme-border-light)',
                  }}
                >
                  <div className="flex-1 min-w-0">{renderLabel(item)}</div>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--theme-brand-primary)' }} />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
