import { ChevronRight } from 'lucide-react'
import { RouteDisplay } from '@/components/shared/RouteDisplay'
import type { WorkOrder } from '@/data/domain'

interface RecentTripSuggestionsProps {
  trips: WorkOrder[]
  onSelect: (trip: { clientId: string; clientName: string; pickupLocation: string; dropoffLocation: string }) => void
  onChooseOther: () => void
}

export function RecentTripSuggestions({ trips, onSelect, onChooseOther }: RecentTripSuggestionsProps) {
  if (trips.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
        Gần đây
      </p>
      <div className="space-y-1">
        {trips.map((trip) => {
          const pickup = trip.pickupLocation || (trip.route || '').split(' - ')[0] || ''
          const dropoff = trip.dropoffLocation || (trip.route || '').split(' - ').slice(1).join(' - ') || ''
          return (
            <button
              key={trip.id}
              onClick={() => onSelect({
                clientId: String(trip.clientId),
                clientName: trip.clientName,
                pickupLocation: pickup,
                dropoffLocation: dropoff,
              })}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all active:scale-[0.98] touch-manipulation"
              style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>
                  {trip.clientName}
                </p>
                <RouteDisplay route={trip.route} pickupLocation={trip.pickupLocation} dropoffLocation={trip.dropoffLocation} />
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
            </button>
          )
        })}
      </div>
      <button
        onClick={onChooseOther}
        className="w-full py-2.5 text-sm font-semibold touch-manipulation"
        style={{ color: 'var(--theme-brand-primary)' }}
      >
        Chọn khác
      </button>
    </div>
  )
}
