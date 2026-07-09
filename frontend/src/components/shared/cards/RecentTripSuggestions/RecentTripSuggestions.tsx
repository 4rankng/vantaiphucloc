import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { SuggestedRoute } from '@/services/api/deliveredTrips.api'

interface RecentTripSuggestionsProps {
  suggestions: SuggestedRoute[]
  selectedTripId?: number | string
  onSelect: (trip: {
    tripId?: number | string
    clientId: string
    clientName: string
    pickupLocation: string
    dropoffLocation: string
  }) => void
  loading?: boolean
}

export function RecentTripSuggestions({
  suggestions,
  selectedTripId,
  onSelect,
  loading,
}: RecentTripSuggestionsProps) {
  const rowHeight = 54
  const rowGap = 6
  const visibleRows = 5
  const listRef = useRef<HTMLDivElement>(null)
  const [hasScrolled, setHasScrolled] = useState(false)
  const [scrollState, setScrollState] = useState({ canScrollUp: false, canScrollDown: false })

  const updateScrollState = useCallback(() => {
    const list = listRef.current
    if (!list) {
      setScrollState({ canScrollUp: false, canScrollDown: false })
      return
    }

    const maxScrollTop = list.scrollHeight - list.clientHeight
    setScrollState({
      canScrollUp: list.scrollTop > 2,
      canScrollDown: list.scrollTop < maxScrollTop - 2,
    })
  }, [])

  useEffect(() => {
    setHasScrolled(false)
    const frameId = window.requestAnimationFrame(updateScrollState)
    return () => window.cancelAnimationFrame(frameId)
  }, [suggestions, updateScrollState])

  const handleScroll = useCallback(() => {
    setHasScrolled(true)
    updateScrollState()
  }, [updateScrollState])

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl animate-pulse"
            style={{ background: 'var(--theme-bg-secondary)', height: 52 }}
          />
        ))}
      </div>
    )
  }

  if (suggestions.length === 0) return null

  return (
    <div className="relative">
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex flex-col gap-1.5 overflow-y-auto pr-1 -mr-1"
        aria-label="Lịch sử khách hàng và tuyến"
        style={{
          maxHeight: rowHeight * visibleRows + rowGap * (visibleRows - 1),
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        {suggestions.map((route) => {
          const pickup = route.pickupLocation?.name || ''
          const dropoff = route.dropoffLocation?.name || ''
          const clientLabel = route.client?.code || route.client?.name || ''
          const routeKey = `${route.client.id}-${route.pickupLocation.id}-${route.dropoffLocation.id}`
          const isSelected = selectedTripId !== undefined && String(selectedTripId) === routeKey

          return (
            <button
              key={routeKey}
              onClick={() => onSelect({
                tripId: routeKey,
                clientId: String(route.client.id),
                clientName: route.client?.code || route.client?.name || '',
                pickupLocation: pickup,
                dropoffLocation: dropoff,
              })}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] touch-manipulation"
              style={{
                minHeight: rowHeight,
                background: isSelected
                  ? 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)'
                  : 'var(--theme-bg-secondary)',
                border: `1px solid ${isSelected ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
              }}
            >
              <div className="min-w-0 flex-1 flex items-center gap-2.5">
                <div className="min-w-0 flex-1 space-y-0.5 text-center">
                  <p
                    className="text-sm font-bold truncate"
                    style={{ color: isSelected ? 'var(--theme-brand-primary)' : 'var(--theme-text-primary)' }}
                  >
                    {clientLabel}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    <span className="truncate">{pickup || '—'}</span>
                    <span className="shrink-0">→</span>
                    <span className="truncate">{dropoff || '—'}</span>
                  </div>
                </div>
              </div>

              {isSelected && (
                <Check className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-brand-primary)' }} />
              )}
            </button>
          )
        })}
      </div>

      {scrollState.canScrollUp && (
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 h-5 rounded-t-xl"
          style={{
            background: 'linear-gradient(180deg, var(--theme-bg-primary) 0%, transparent 100%)',
          }}
        />
      )}

      {scrollState.canScrollDown && (
        <div
          className="pointer-events-none absolute left-0 right-0 bottom-0 h-9 rounded-b-xl"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, var(--theme-bg-primary) 100%)',
          }}
        />
      )}

      {scrollState.canScrollDown && !hasScrolled && (
        <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center animate-bounce"
            style={{
              background: 'color-mix(in srgb, var(--theme-bg-primary) 92%, transparent)',
              border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 24%, transparent)',
              boxShadow: '0 4px 12px color-mix(in srgb, var(--theme-brand-primary) 14%, transparent)',
              color: 'var(--theme-brand-primary)',
            }}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  )
}
