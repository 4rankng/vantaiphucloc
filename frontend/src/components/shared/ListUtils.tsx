import { useRef, useEffect, useCallback } from 'react'
import { Search, Check, X } from 'lucide-react'

// ─── Infinite scroll hook ─────────────────────────────────────────────────────
// Uses a callback ref so the IntersectionObserver is attached whenever the
// sentinel element mounts — including after async data loads make hasMore=true.

// eslint-disable-next-line react-refresh/only-export-components
export function useInfiniteScroll(onLoadMore: () => void) {
  const onLoadMoreRef = useRef(onLoadMore)
  useEffect(() => { onLoadMoreRef.current = onLoadMore }, [onLoadMore])

  const observerRef = useRef<IntersectionObserver | null>(null)

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    if (!node) return
    observerRef.current = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMoreRef.current() },
      { threshold: 0.1 },
    )
    observerRef.current.observe(node)
  }, [])

  return sentinelRef
}

export function LoadMoreSentinel({ sentinelRef, hasMore }: {
  sentinelRef: React.Ref<HTMLDivElement>; hasMore: boolean
}) {
  if (!hasMore) return null
  return (
    <div ref={sentinelRef} className="flex justify-center py-3">
      <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Đang tải…</span>
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div className="relative" style={{ flex: 1, maxWidth: 360 }}>
      <Search className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ left: 10, color: 'var(--ink-3)' }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="nepo-input text-[13px]" style={{ paddingLeft: 32 }} />
    </div>
  )
}

// ─── Inline save/cancel icons ─────────────────────────────────────────────────
// Rendered as two flush, opaque trailing buttons matching the input's height so
// they read as part of the edited control, not a floating mini-toolbar.
// Keyboard hints live in `title` tooltips — no persistent chip cluttering the row.

// `hintAlign` kept for backward compatibility but no longer needed — layout is
// symmetric now and positioning is handled by the caller.
export function FieldActions({ onSave, onCancel, saving, hintAlign = 'left' }: {
  onSave: () => void; onCancel: () => void; saving?: boolean; hintAlign?: 'left' | 'right'
}) {
  return (
    <div className="relative flex items-center select-none" style={{ height: 30 }}>
      <div className="flex items-center" style={{ height: 30, gap: 3 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          title="Lưu (Enter)"
          aria-label="Lưu"
          className="flex items-center justify-center transition-all active:scale-95 hover:brightness-110"
          style={{
            width: 30,
            height: 30,
            borderRadius: 6,
            background: 'var(--success)',
            color: '#fff',
            opacity: saving ? 0.7 : 1,
            boxShadow: '0 1px 2px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)',
          }}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          title="Huỷ (Esc)"
          aria-label="Huỷ"
          className="flex items-center justify-center transition-all active:scale-95 hover:bg-zinc-50"
          style={{
            width: 30,
            height: 30,
            borderRadius: 6,
            background: '#fff',
            border: '1px solid var(--line, #e4e4e7)',
            color: 'var(--ink-2)',
            opacity: saving ? 0.5 : 1,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
      <div style={{
        position: 'absolute',
        top: '100%',
        marginTop: 4,
        ...(hintAlign === 'right' ? { right: 0 } : { left: 0 }),
        fontSize: '9px',
        color: 'var(--ink-2)',
        whiteSpace: 'nowrap',
        background: 'var(--surface, #fff)',
        padding: '2px 5px',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        pointerEvents: 'none',
        lineHeight: 1.1,
        fontFamily: 'var(--theme-font-body, inherit)',
        fontWeight: 550,
        border: '1px solid var(--line, #e4e4e7)',
      }}>
        Enter: xác nhận • Esc: huỷ
      </div>
    </div>
  )
}
