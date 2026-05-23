import { useRef, useEffect, useCallback } from 'react'
import { Search, Check, X } from 'lucide-react'

// ─── Infinite scroll hook ─────────────────────────────────────────────────────
// Uses a callback ref so the IntersectionObserver is attached whenever the
// sentinel element mounts — including after async data loads make hasMore=true.

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

export function FieldActions({ onSave, onCancel, saving, hintAlign = 'left' }: {
  onSave: () => void; onCancel: () => void; saving?: boolean; hintAlign?: 'left' | 'right'
}) {
  return (
    <div className="flex items-center gap-1 ml-2 relative" style={{ marginTop: -4 }}>
      <button type="button" onClick={onSave} disabled={saving}
        className="flex items-center justify-center rounded transition-colors"
        style={{ width: 24, height: 24, background: 'var(--success)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
        <Check className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onCancel} disabled={saving}
        className="flex items-center justify-center rounded transition-colors"
        style={{ width: 24, height: 24, background: 'var(--surface-3)', color: 'var(--ink-2)', opacity: saving ? 0.5 : 1 }}>
        <X className="h-3.5 w-3.5" />
      </button>
      <span
        className="absolute top-full text-[9px] leading-none select-none whitespace-nowrap pointer-events-none"
        style={{ color: 'var(--ink-4)', marginTop: 7, ...(hintAlign === 'right' ? { right: 0 } : { left: 0 }) }}
      >
        Enter xác nhận · Esc huỷ
      </span>
    </div>
  )
}
