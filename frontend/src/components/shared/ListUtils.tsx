import { useRef, useEffect } from 'react'
import { Search, Check, X } from 'lucide-react'

// ─── Infinite scroll hook ─────────────────────────────────────────────────────

export function useInfiniteScroll(onLoadMore: () => void) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMore() },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onLoadMore])
  return sentinelRef
}

export function LoadMoreSentinel({ sentinelRef, hasMore }: {
  sentinelRef: React.RefObject<HTMLDivElement>; hasMore: boolean
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

export function FieldActions({ onSave, onCancel, saving }: {
  onSave: () => void; onCancel: () => void; saving?: boolean
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
      <span className="absolute top-full left-0 text-[9px] leading-none select-none whitespace-nowrap pointer-events-none"
            style={{ color: 'var(--ink-4)', marginTop: 2 }}>
        Enter xác nhận · Esc huỷ
      </span>
    </div>
  )
}
