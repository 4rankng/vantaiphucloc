import { fmtDate } from '@/lib/date-utils'
import { Plus, Check, ChevronDown, ChevronRight, X, CheckCircle2 } from 'lucide-react'
import { ContBadge } from '@/components/shared/ContBadge'
import { InlineField } from './InlineField'
import type { BookedTrip } from '@/data/domain'

export function SuggestionCard({
  trip, isSelected, matchedCount, totalCriteria,
  tripContainers, tripClient, tripPickup, tripDropoff,
  matchedTripContainerIndices, clientMatch, pickupMatch, dropoffMatch,
  updateTripContainer, setTripContainers,
  onChangeTripClient, onChangeTripPickup, onChangeTripDropoff,
  onSelect, onConfirm, submitting,
}: {
  trip: BookedTrip
  isSelected: boolean
  matchedCount: number
  totalCriteria: number
  tripContainers: { workType: string; containerNumber: string }[]
  tripClient: string
  tripPickup: string
  tripDropoff: string
  matchedTripContainerIndices: Set<number>
  clientMatch: boolean
  pickupMatch: boolean
  dropoffMatch: boolean
  updateTripContainer: (idx: number, field: 'workType' | 'containerNumber', value: string) => void
  setTripContainers: React.Dispatch<React.SetStateAction<{ workType: string; containerNumber: string }[]>>
  onChangeTripClient: (v: string) => void
  onChangeTripPickup: (v: string) => void
  onChangeTripDropoff: (v: string) => void
  onSelect: () => void
  onConfirm: () => void
  submitting: boolean
}) {
  const isFullMatch = totalCriteria > 0 && matchedCount === totalCriteria
  const isPartialMatch = matchedCount > 0 && matchedCount < totalCriteria

  const scoreColor = isFullMatch
    ? 'var(--theme-status-success)'
    : isPartialMatch
    ? 'var(--theme-status-warning)'
    : 'var(--theme-text-muted)'

  const tripDateShort = trip.tripDate ? fmtDate(trip.tripDate) : null

  // Collapsed card
  if (!isSelected) {
    return (
      <button
        onClick={onSelect}
        className="w-full text-left rounded-xl p-4 transition-all flex items-start gap-3"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-light)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-brand-primary)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-border-light)' }}
      >
        {/* Match score badge */}
        <div
          className="shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-lg mt-0.5"
          style={{ background: `color-mix(in srgb, ${scoreColor} 12%, transparent)` }}
        >
          <span className="text-[13px] font-bold tabular-nums leading-none" style={{ color: scoreColor }}>
            {matchedCount}/{totalCriteria}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {tripDateShort && (
              <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>{tripDateShort}</span>
            )}
          </div>

          {/* Containers */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {(trip.containers?.length ? trip.containers : []).map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                <ContBadge type={c.workType} />
                <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                  {c.containerNumber}
                </span>
              </span>
            ))}
          </div>

          <p className="text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>
            <span className="font-medium">{trip.client.name}</span>
            {trip.pickupLocation?.name ? <span> · {trip.pickupLocation.name} → {trip.dropoffLocation?.name}</span> : null}
          </p>
        </div>

        <ChevronRight className="w-4 h-4 shrink-0 mt-3" style={{ color: 'var(--theme-text-muted)' }} />
      </button>
    )
  }

  // Expanded card (selected)
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: '2px solid var(--theme-brand-primary)',
        background: 'var(--theme-bg-primary)',
      }}
    >
      {/* Expanded header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)' }}
      >
        <div
          className="shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-lg"
          style={{ background: `color-mix(in srgb, ${scoreColor} 12%, transparent)` }}
        >
          <span className="text-[13px] font-bold tabular-nums leading-none" style={{ color: scoreColor }}>
            {matchedCount}/{totalCriteria}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {tripDateShort && (
              <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>{tripDateShort}</span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>
            <span className="font-medium">{trip.client.name}</span>
            {trip.pickupLocation?.name ? <span> · {trip.pickupLocation.name} → {trip.dropoffLocation?.name}</span> : null}
          </p>
        </div>

        <button
          onClick={onSelect}
          className="p-1.5 rounded-lg transition-colors"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded content */}
      <div className="p-4 space-y-4">

        {/* Containers section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
              Container đơn hàng
            </span>
            <button
              onClick={() => setTripContainers(prev => [...prev, { workType: 'E20', containerNumber: '' }])}
              className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded"
              style={{ color: 'var(--theme-brand-primary)', background: 'var(--theme-brand-primary-light)' }}
            >
              <Plus className="w-3 h-3" /> Thêm
            </button>
          </div>
          <div className="space-y-1.5">
            {tripContainers.map((c, idx) => {
              const isContainerMatched = matchedTripContainerIndices.has(idx)
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                  style={{
                    background: isContainerMatched
                      ? 'color-mix(in srgb, var(--theme-status-success) 8%, transparent)'
                      : 'var(--theme-bg-secondary)',
                    border: `1px solid ${isContainerMatched ? 'var(--theme-status-success)' : 'var(--theme-border-default)'}`,
                  }}
                >
                  {isContainerMatched ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--theme-status-success)' }} />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={{ borderColor: 'var(--theme-border-default)' }} />
                  )}
                  <input
                    value={c.workType}
                    onChange={e => updateTripContainer(idx, 'workType', e.target.value.toUpperCase())}
                    className="w-14 px-2 py-1 rounded text-xs font-bold text-center border"
                    style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-primary)', color: 'var(--theme-brand-primary)' }}
                  />
                  <input
                    value={c.containerNumber}
                    onChange={e => updateTripContainer(idx, 'containerNumber', e.target.value.toUpperCase())}
                    className="flex-1 px-2 py-1 rounded text-xs font-mono border"
                    style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-primary)', color: 'var(--theme-text-primary)' }}
                  />
                  <button
                    onClick={() => setTripContainers(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1 rounded"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Info fields */}
        <div className="space-y-2">
          <InlineField label="Khách hàng" value={tripClient} onChange={onChangeTripClient} matched={clientMatch} />
          <InlineField label="Điểm lấy" value={tripPickup} onChange={onChangeTripPickup} matched={pickupMatch} />
          <InlineField label="Điểm trả" value={tripDropoff} onChange={onChangeTripDropoff} matched={dropoffMatch} />
        </div>

        {/* Confirm button */}
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-60"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <Check className="w-4 h-4" />
          {submitting ? 'Đang ghép...' : 'Xác nhận ghép chuyến'}
        </button>
      </div>
    </div>
  )
}
