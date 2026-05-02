import { Check } from 'lucide-react'
import type { WorkOrder } from '@/data/domain'

interface RecentTripSuggestionsProps {
  trips: WorkOrder[]
  selectedClientId?: string
  selectedPickup?: string
  selectedDropoff?: string
  onSelect: (trip: { clientId: string; clientName: string; pickupLocation: string; dropoffLocation: string }) => void
}

export function RecentTripSuggestions({
  trips,
  selectedClientId,
  selectedPickup,
  selectedDropoff,
  onSelect,
}: RecentTripSuggestionsProps) {
  if (trips.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {trips.map((trip) => {
        const pickup = trip.pickupLocation || (trip.route || '').split(' - ')[0] || ''
        const dropoff = trip.dropoffLocation || (trip.route || '').split(' - ').slice(1).join(' - ') || ''
        const clientLabel = trip.clientCode || trip.clientName
        const isSelected =
          selectedClientId === String(trip.clientId) &&
          selectedPickup === pickup &&
          selectedDropoff === dropoff
        return (
          <button
            key={trip.id}
            onClick={() => onSelect({
              clientId: String(trip.clientId),
              clientName: trip.clientName,
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
            {isSelected && (
              <Check className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-brand-primary)' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
