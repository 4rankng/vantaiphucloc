import { useState, useMemo, useCallback } from 'react'
import { fmtDate } from '@/lib/date-utils'
import {
  Check, CheckCircle2, Pencil, X, Plus, Truck, FileText,
  Sparkles, ChevronRight, ChevronDown, XCircle,
} from 'lucide-react'
import {
  useDeliveredTrips, useBookedTrips, useSuggestMatches, useRoutes,
  useUpdateDeliveredTrip, useUpdateBookedTrip, useReconcile,
} from '@/hooks/use-queries'
import { ContBadge } from '@/components/shared/ContBadge'
import { useToast } from '@/components/atoms/Toast'
import type { BookedTrip, DeliveredTrip, ContType } from '@/data/domain'

// ─── Helpers ─────────────────────────────────────────────────────────────────


// ─── Inline editable field ────────────────────────────────────────────────────

function InlineField({
  label, value, onChange, placeholder, matched,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  matched?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    onChange(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            className="flex-1 px-2 py-1 rounded text-sm border"
            style={{
              background: 'var(--theme-bg-primary)',
              borderColor: 'var(--theme-brand-primary)',
              color: 'var(--theme-text-primary)',
              outline: 'none',
            }}
          />
          <button onClick={commit} className="p-1 rounded" style={{ color: 'var(--theme-status-success)' }}>
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setEditing(false)} className="p-1 rounded" style={{ color: 'var(--theme-text-muted)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
      style={{
        background: matched ? 'color-mix(in srgb, var(--theme-status-success) 8%, transparent)' : 'transparent',
        border: `1px solid ${matched ? 'var(--theme-status-success)' : 'var(--theme-border-default)'}`,
      }}
    >
      <div className="flex-1 min-w-0 group/field">
        <span className="text-[10px] font-semibold uppercase tracking-wide block mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
        <button
          onClick={() => { setDraft(value); setEditing(true) }}
          className="flex items-center gap-1.5 text-left w-full"
        >
          <span className="text-sm font-medium" style={{ color: value ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>
            {value || placeholder || '—'}
          </span>
          <Pencil className="w-3 h-3 opacity-0 group-hover/field:opacity-60 transition-opacity shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
        </button>
      </div>
      <div className="shrink-0 w-5 h-5 flex items-center justify-center">
        {matched ? (
          <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--theme-status-success)' }} />
        ) : (
          <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: 'var(--theme-border-default)' }} />
        )}
      </div>
    </div>
  )
}

// ─── Container row (editable) ─────────────────────────────────────────────────

function ContainerRow({
  workType, containerNumber, matched, onEditType, onEditNumber,
}: {
  workType: string
  containerNumber: string
  matched: boolean
  onEditType: (v: string) => void
  onEditNumber: (v: string) => void
}) {
  const [editingType, setEditingType] = useState(false)
  const [editingNumber, setEditingNumber] = useState(false)
  const [draftType, setDraftType] = useState(workType)
  const [draftNumber, setDraftNumber] = useState(containerNumber)

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
      style={{
        background: matched ? 'color-mix(in srgb, var(--theme-status-success) 8%, transparent)' : 'var(--theme-bg-secondary)',
        border: `1px solid ${matched ? 'var(--theme-status-success)' : 'var(--theme-border-default)'}`,
      }}
    >
      {editingType ? (
        <input
          autoFocus
          value={draftType}
          onChange={e => setDraftType(e.target.value.toUpperCase())}
          onBlur={() => { onEditType(draftType); setEditingType(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { onEditType(draftType); setEditingType(false) } if (e.key === 'Escape') setEditingType(false) }}
          className="w-14 px-1.5 py-0.5 rounded text-xs font-bold text-center border"
          style={{ borderColor: 'var(--theme-brand-primary)', background: 'var(--theme-bg-primary)', color: 'var(--theme-brand-primary)' }}
        />
      ) : (
        <button onClick={() => { setDraftType(workType); setEditingType(true) }} className="shrink-0">
          <ContBadge type={workType} />
        </button>
      )}

      <div className="flex-1 min-w-0">
        {editingNumber ? (
          <input
            autoFocus
            value={draftNumber}
            onChange={e => setDraftNumber(e.target.value.toUpperCase())}
            onBlur={() => { onEditNumber(draftNumber); setEditingNumber(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { onEditNumber(draftNumber); setEditingNumber(false) } if (e.key === 'Escape') setEditingNumber(false) }}
            className="w-full px-2 py-1 rounded text-sm font-mono border"
            style={{ borderColor: 'var(--theme-brand-primary)', background: 'var(--theme-bg-primary)', color: 'var(--theme-text-primary)' }}
          />
        ) : (
          <button
            onClick={() => { setDraftNumber(containerNumber); setEditingNumber(true) }}
            className="flex items-center gap-1.5 group/num"
          >
            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {containerNumber}
            </span>
            <Pencil className="w-3 h-3 opacity-0 group-hover/num:opacity-50 transition-opacity" style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        )}
      </div>

      <div className="shrink-0 w-5 h-5 flex items-center justify-center">
        {matched ? (
          <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--theme-status-success)' }} />
        ) : (
          <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: 'var(--theme-border-default)' }} />
        )}
      </div>
    </div>
  )
}

// ─── Work order top card ──────────────────────────────────────────────────────

function DeliveredTripCard({
  driverName, driverPlate, woContainers, woClient, woPickup, woDropoff,
  setWoClient, setWoPickup, setWoDropoff, setWoContainers, updateWoContainer,
  clientMatch, pickupMatch, dropoffMatch, matchedWoIndices,
}: {
  driverName: string
  driverPlate?: string | null
  woContainers: { workType: string; containerNumber: string }[]
  woClient: string
  woPickup: string
  woDropoff: string
  setWoClient: (v: string) => void
  setWoPickup: (v: string) => void
  setWoDropoff: (v: string) => void
  setWoContainers: React.Dispatch<React.SetStateAction<{ workType: string; containerNumber: string }[]>>
  updateWoContainer: (idx: number, field: 'workType' | 'containerNumber', value: string) => void
  clientMatch: boolean
  pickupMatch: boolean
  dropoffMatch: boolean
  matchedWoIndices: Set<number>
}) {
  const [editMode, setEditMode] = useState(false)

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-full shrink-0"
          style={{ background: 'var(--theme-brand-primary-light)' }}
        >
          <Truck className="w-3.5 h-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>Chuyến đã đi</span>
        <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>· {driverName}{driverPlate ? ` · ${driverPlate}` : ''}</span>
        <button
          onClick={() => setEditMode(v => !v)}
          className="ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
          style={{
            background: editMode ? 'var(--theme-brand-primary-light)' : 'var(--theme-bg-tertiary)',
            color: editMode ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)',
          }}
        >
          <Pencil className="w-3 h-3" />
          {editMode ? 'Xong' : 'Sửa'}
        </button>
      </div>

      {/* Containers (compact when not editing) */}
      {!editMode ? (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {woContainers.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <ContBadge type={c.workType} />
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {c.containerNumber || '—'}
              </span>
              {matchedWoIndices.has(i) && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-success)' }} />}
            </span>
          ))}
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
              Container ({woContainers.length})
            </span>
            <button
              onClick={() => setWoContainers(prev => [...prev, { workType: 'E20', containerNumber: '' }])}
              className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded"
              style={{ color: 'var(--theme-brand-primary)', background: 'var(--theme-brand-primary-light)' }}
            >
              <Plus className="w-3 h-3" /> Thêm
            </button>
          </div>
          {woContainers.map((c, idx) => (
            <ContainerRow
              key={idx}
              workType={c.workType}
              containerNumber={c.containerNumber}
              matched={matchedWoIndices.has(idx)}
              onEditType={v => updateWoContainer(idx, 'workType', v)}
              onEditNumber={v => updateWoContainer(idx, 'containerNumber', v)}
            />
          ))}
        </div>
      )}

      {/* Info fields */}
      {!editMode ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { label: 'Khách hàng', val: woClient, matched: clientMatch },
            { label: 'Điểm lấy', val: woPickup, matched: pickupMatch },
            { label: 'Điểm trả', val: woDropoff, matched: dropoffMatch },
          ].map(({ label, val, matched }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ color: 'var(--theme-text-muted)' }}>{label}:</span>
              <span className="text-xs font-medium truncate" style={{ color: val ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>
                {val || '—'}
              </span>
              {matched && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--theme-status-success)' }} />}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <InlineField label="Khách hàng" value={woClient} onChange={setWoClient} placeholder="Chưa có" matched={clientMatch} />
          <InlineField label="Điểm lấy" value={woPickup} onChange={setWoPickup} placeholder="—" matched={pickupMatch} />
          <InlineField label="Điểm trả" value={woDropoff} onChange={setWoDropoff} placeholder="—" matched={dropoffMatch} />
        </div>
      )}
    </div>
  )
}

// ─── Suggestion card ──────────────────────────────────────────────────────────

function SuggestionCard({
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
            <span className="font-medium">{trip.partner.name}</span>
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
            <span className="font-medium">{trip.partner.name}</span>
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

// ─── Main panel ────────────────────────────────────────────────────────────────

interface MatchPanelProps {
  deliveredTrip: DeliveredTrip
  onClose: () => void
  onMatchSuccess: () => void
}

export function MatchPanel({ deliveredTrip, onClose, onMatchSuccess }: MatchPanelProps) {
  const toast = useToast()

  // ── Data ──────────────────────────────────────────────────────────────────
  const { isLoading: loadingWO } = useDeliveredTrips()
  const { data: allTrips = [], isLoading: loadingTrips } = useBookedTrips()
  const { data: suggestionsData, isLoading: loadingSuggestions } = useSuggestMatches(deliveredTrip.id)
  const { data: routes = [] } = useRoutes()

  const routeMap = useMemo(() =>
    new Map(routes.map(r => [r.route, { pickup: r.pickupLocation.name, dropoff: r.dropoffLocation.name }])),
    [routes]
  )

  const updateDeliveredTrip = useUpdateDeliveredTrip()
  const updateBookedTrip = useUpdateBookedTrip()
  const reconcile = useReconcile()

  const loading = loadingWO || loadingTrips

  // ── Work order ────────────────────────────────────────────────────────────
  const [woClient, setWoClient] = useState('')
  const [woRoute, setWoRoute] = useState('')
  const [woPickup, setWoPickup] = useState('')
  const [woDropoff, setWoDropoff] = useState('')
  const [woContainers, setWoContainers] = useState<{ workType: string; containerNumber: string }[]>([])
  const [woInitialized, setWoInitialized] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (deliveredTrip && !woInitialized) {
      setWoClient(deliveredTrip.partner.name)
      setWoRoute(deliveredTrip.route)
      const resolved = routeMap.get(deliveredTrip.route)
      setWoPickup(deliveredTrip.pickupLocation.name || resolved?.pickup || '')
      setWoDropoff(deliveredTrip.dropoffLocation.name || resolved?.dropoff || '')
      setWoContainers(deliveredTrip.containers.map(c => ({ workType: c.workType, containerNumber: c.containerNumber })))
      setWoInitialized(true)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [deliveredTrip, woInitialized, routeMap])

  const updateWoContainer = useCallback((idx: number, field: 'workType' | 'containerNumber', value: string) => {
    setWoContainers(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }, [])

  // ── Suggestions ───────────────────────────────────────────────────────────
  const suggestions = useMemo(() => suggestionsData?.suggestions ?? [], [suggestionsData])

  // ── Selected trip ─────────────────────────────────────────────────────────
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (selectedTripId === null && suggestions.length > 0) {
      setSelectedTripId(suggestions[0].bookedTrip.id)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [suggestions, selectedTripId])

  const selectedTrip = useMemo(
    () => allTrips.find(t => t.id === selectedTripId) ?? null,
    [allTrips, selectedTripId],
  )

  // Local editable state for selected trip
  const [tripClient, setTripClient] = useState('')
  const [tripRoute, setTripRoute] = useState('')
  const [tripPickup, setTripPickup] = useState('')
  const [tripDropoff, setTripDropoff] = useState('')
  const [tripContainers, setTripContainers] = useState<{ workType: string; containerNumber: string }[]>([])
  const [tripInitKey, setTripInitKey] = useState<number | null>(null)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (selectedTrip && selectedTrip.id !== tripInitKey) {
      setTripClient(selectedTrip.partner.name)
      setTripRoute(selectedTrip.route)
      const resolved = routeMap.get(selectedTrip.route)
      setTripPickup(selectedTrip.pickupLocation.name || resolved?.pickup || '')
      setTripDropoff(selectedTrip.dropoffLocation.name || resolved?.dropoff || '')
      setTripContainers(
        (selectedTrip.containers ?? []).map(c => ({ workType: c.workType, containerNumber: c.containerNumber }))
      )
      setTripInitKey(selectedTrip.id)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedTrip, tripInitKey, routeMap])

  const updateTripContainer = useCallback((idx: number, field: 'workType' | 'containerNumber', value: string) => {
    setTripContainers(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }, [])

  // ── Match computation ─────────────────────────────────────────────────────
  const selectedSuggestion = useMemo(
    () => suggestions.find(s => s.bookedTrip.id === selectedTripId) ?? null,
    [suggestions, selectedTripId]
  )
  const backendMatchedFields = useMemo(
    () => new Set(selectedSuggestion?.matchedFields ?? []),
    [selectedSuggestion]
  )

  const matchedWoIndices = useMemo(() => {
    if (!selectedTrip) return new Set<number>()
    const tripSet = new Set(tripContainers.map(c => `${c.workType}|${c.containerNumber}`))
    return new Set(
      woContainers
        .map((c, i) => tripSet.has(`${c.workType}|${c.containerNumber}`) ? i : -1)
        .filter(i => i >= 0)
    )
  }, [woContainers, tripContainers, selectedTrip])

  const matchedTripContainerIndices = useMemo(() => {
    const woSet = new Set(woContainers.map(c => `${c.workType}|${c.containerNumber}`))
    return new Set(
      tripContainers
        .map((c, i) => (c.containerNumber && woSet.has(`${c.workType}|${c.containerNumber}`)) ? i : -1)
        .filter(i => i >= 0)
    )
  }, [woContainers, tripContainers])

  const clientMatch = backendMatchedFields.has('client') || (woClient !== '' && woClient === tripClient)
  const pickupMatch = backendMatchedFields.has('pickup_location') || (woPickup !== '' && woPickup === tripPickup)
  const dropoffMatch = backendMatchedFields.has('dropoff_location') || (woDropoff !== '' && woDropoff === tripDropoff)

  const totalCriteria = useMemo(() =>
    woContainers.length
    + (woClient !== '' ? 1 : 0)
    + (woPickup !== '' ? 1 : 0)
    + (woDropoff !== '' ? 1 : 0),
    [woContainers, woClient, woPickup, woDropoff]
  )

  // ── Submit ────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)

  const handleMatch = async () => {
    if (!deliveredTrip || !selectedTrip || submitting) return
    setSubmitting(true)

    const woResult = await updateDeliveredTrip.mutateAsync({
      id: deliveredTrip.id,
      data: {
        route: woRoute,
        containers: woContainers.map(c => ({ containerNumber: c.containerNumber, contType: c.contType as ContType, photoUrl: '' })),
      },
    })
    if (!woResult.success) {
      toast.error('Lỗi', 'Không thể cập nhật phiếu chuyến')
      setSubmitting(false)
      return
    }

    const toResult = await updateBookedTrip.mutateAsync({
      id: selectedTrip.id,
      data: {
        route: tripRoute,
        containers: tripContainers.map(c => ({ containerNumber: c.containerNumber, contType: c.contType as ContType })),
      },
    })
    if (!toResult.success) {
      toast.error('Lỗi', 'Không thể cập nhật đơn hàng')
      setSubmitting(false)
      return
    }

    await reconcile.mutateAsync({ deliveredTripId: deliveredTrip.id, bookedTripId: selectedTrip.id })

    toast.success('Thành công', 'Đã ghép chuyến thành công')
    onMatchSuccess()
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-40 rounded-xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">

      {/* Close button */}
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
        >
          <XCircle className="w-3.5 h-3.5" />
          Thu gọn
        </button>
      </div>

      {/* Work order card */}
      <DeliveredTripCard
        driverName={deliveredTrip.driver?.name ?? (deliveredTrip.vehicleExternalPlate ? `Xe ngoài · ${deliveredTrip.vehicleExternalPlate}` : 'Xe ngoài')}
        driverPlate={deliveredTrip.driver?.vehicle?.plate ?? deliveredTrip.vehicleExternalPlate}
        woContainers={woContainers}
        woClient={woClient}
        woPickup={woPickup}
        woDropoff={woDropoff}
        setWoClient={setWoClient}
        setWoPickup={setWoPickup}
        setWoDropoff={setWoDropoff}
        setWoContainers={setWoContainers}
        updateWoContainer={updateWoContainer}
        clientMatch={clientMatch}
        pickupMatch={pickupMatch}
        dropoffMatch={dropoffMatch}
        matchedWoIndices={matchedWoIndices}
      />

      {/* Suggestions section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            Đơn hàng có thể ghép
          </h2>
          {loadingSuggestions ? (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
              <Sparkles className="w-3 h-3 animate-pulse" /> Đang tìm...
            </span>
          ) : (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
            >
              {suggestions.length}
            </span>
          )}
        </div>

        {suggestions.length === 0 && !loadingSuggestions ? (
          <div
            className="rounded-xl p-10 text-center flex flex-col items-center gap-3"
            style={{ background: 'var(--theme-bg-secondary)', border: '1px dashed var(--theme-border-default)' }}
          >
            <FileText className="w-10 h-10" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Không tìm thấy đơn hàng phù hợp
            </p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              Tạo đơn hàng mới để bắt đầu ghép chuyến
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map(s => {
              const sTripContainers = s.bookedTrip.containers ?? []
              const sTripContainerSet = new Set(sTripContainers.map(c => `${c.workType}|${c.containerNumber}`))
              const matchedContainersCount = woContainers.filter(
                c => c.containerNumber && sTripContainerSet.has(`${c.workType}|${c.containerNumber}`)
              ).length
              const matchedCount = matchedContainersCount
                + (s.matchedFields.includes('client') ? 1 : 0)
                + (s.matchedFields.includes('pickup_location') ? 1 : 0)
                + (s.matchedFields.includes('dropoff_location') ? 1 : 0)

              const isSelected = selectedTripId === s.bookedTrip.id

              return (
                <SuggestionCard
                  key={s.bookedTrip.id}
                  trip={s.bookedTrip}
                  isSelected={isSelected}
                  matchedCount={matchedCount}
                  totalCriteria={totalCriteria}
                  tripContainers={isSelected ? tripContainers : (s.bookedTrip.containers ?? []).map(c => ({ workType: c.workType, containerNumber: c.containerNumber }))}
                  tripClient={isSelected ? tripClient : s.bookedTrip.partner.name}
                  tripPickup={isSelected ? tripPickup : ''}
                  tripDropoff={isSelected ? tripDropoff : ''}
                  matchedTripContainerIndices={isSelected ? matchedTripContainerIndices : new Set()}
                  clientMatch={isSelected ? clientMatch : false}
                  pickupMatch={isSelected ? pickupMatch : false}
                  dropoffMatch={isSelected ? dropoffMatch : false}
                  updateTripContainer={updateTripContainer}
                  setTripContainers={setTripContainers}
                  onChangeTripClient={setTripClient}
                  onChangeTripPickup={setTripPickup}
                  onChangeTripDropoff={setTripDropoff}
                  onSelect={() => setSelectedTripId(isSelected ? null : s.bookedTrip.id)}
                  onConfirm={handleMatch}
                  submitting={submitting}
                />
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
