import { Check } from 'lucide-react'
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
    <div className="flex flex-col gap-1.5">
      {suggestions.map((route, idx) => {
        const pickup = route.pickupLocation?.name || ''
        const dropoff = route.dropoffLocation?.name || ''
        const clientLabel = route.client?.code || route.client?.name || ''
        const isSelected = selectedTripId !== undefined && String(selectedTripId) === String(idx)

        return (
          <button
            key={`${route.client.id}-${route.pickupLocation.id}-${route.dropoffLocation.id}`}
            onClick={() => onSelect({
              tripId: idx,
              clientId: String(route.client.id),
              clientName: route.client?.code || route.client?.name || '',
              pickupLocation: pickup,
              dropoffLocation: dropoff,
            })}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] touch-manipulation"
            style={{
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
  )
}
