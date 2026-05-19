import { Check, TrendingUp, Clock, Star } from 'lucide-react'
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

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof TrendingUp; color: string }> = {
  frequent: { label: 'Quen thuộc', icon: Star, color: 'var(--theme-brand-primary)' },
  recent:   { label: 'Gần đây',   icon: Clock, color: 'var(--theme-status-info, #3b82f6)' },
  popular:  { label: 'Phổ biến',  icon: TrendingUp, color: 'var(--theme-status-warning)' },
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
        const clientLabel = route.partner?.code || route.partner?.name || ''
        const isSelected = selectedTripId !== undefined && String(selectedTripId) === String(idx)
        const src = SOURCE_CONFIG[route.source] ?? SOURCE_CONFIG.recent
        const SrcIcon = src.icon

        return (
          <button
            key={`${route.partner.id}-${route.pickupLocation.id}-${route.dropoffLocation.id}`}
            onClick={() => onSelect({
              tripId: idx,
              clientId: String(route.partner.id),
              clientName: route.partner.name,
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

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {/* Source badge */}
              <span
                className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: `color-mix(in srgb, ${src.color} 12%, transparent)`, color: src.color }}
              >
                <SrcIcon className="w-2.5 h-2.5" />
                {src.label}
              </span>

              {isSelected && (
                <Check className="w-4 h-4" style={{ color: 'var(--theme-brand-primary)' }} />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
