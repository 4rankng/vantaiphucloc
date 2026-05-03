import { useParams, useNavigate } from 'react-router-dom'
import { useState, useMemo, useCallback } from 'react'
import { ArrowLeft, Check, CheckCircle2, AlertCircle, Pencil, X, Plus, Truck, FileText, Sparkles } from 'lucide-react'
import {
  useWorkOrders, useTripOrders, useSuggestMatches, useRoutes,
  useUpdateWorkOrder, useUpdateTripOrder, useCreateTripOrder,
} from '@/hooks/use-queries'
import { ContBadge } from '@/components/shared/ContBadge'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'
import type { TripOrder, WorkType } from '@/data/domain'

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

// ─── Container row with match tick ───────────────────────────────────────────

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
      {/* Type badge — click to edit */}
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

      {/* Container number — click to edit */}
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

      {/* Match indicator */}
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

// ─── Trip order row in right panel ───────────────────────────────────────────

function TripRow({
  trip, isSelected, matchedCount, totalWoConts, score, confidence, onClick,
}: {
  trip: TripOrder
  isSelected: boolean
  matchedCount: number
  totalWoConts: number
  score: number
  confidence: string
  onClick: () => void
}) {
  const isFull = confidence === 'full'
  const isPartial = confidence === 'partial'
  const accentColor = isFull
    ? 'var(--theme-status-success)'
    : isPartial
    ? 'var(--theme-status-warning)'
    : 'var(--theme-text-muted)'

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors"
      style={{
        borderBottom: '1px solid var(--theme-border-light)',
        background: isSelected
          ? 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)'
          : isFull
          ? 'color-mix(in srgb, var(--theme-status-success) 5%, transparent)'
          : 'transparent',
        borderLeft: isSelected ? '3px solid var(--theme-brand-primary)' : '3px solid transparent',
      }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: isSelected ? 'var(--theme-brand-primary-light)' : 'var(--theme-bg-tertiary)' }}
      >
        <FileText className="w-4 h-4" style={{ color: isSelected ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)' }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Containers */}
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {(trip.containers?.length ? trip.containers : []).map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <ContBadge type={c.workType} />
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {c.containerNumber}
              </span>
            </span>
          ))}
        </div>
        {/* Client · Route */}
        <p className="text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>
          <span className="font-medium">{trip.clientName}</span>
          {trip.route ? <span> · {trip.route}</span> : null}
        </p>
        {/* Match chips */}
        {matchedCount > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5"
              style={{ background: 'color-mix(in srgb, var(--theme-status-success) 15%, transparent)', color: 'var(--theme-status-success)' }}
            >
              <Check className="w-2.5 h-2.5" />
              {matchedCount}/{totalWoConts} cont khớp
            </span>
          </div>
        )}
      </div>

      {/* Score */}
      <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
        <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--theme-bg-tertiary)' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, score)}%`, background: accentColor }} />
        </div>
        <span className="text-[10px] font-bold tabular-nums" style={{ color: accentColor }}>
          {Math.min(100, score)}%
        </span>
      </div>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MatchJob() {
  const { jobId: jobIdStr } = useParams<{ jobId: string }>()
  const jobId = Number(jobIdStr)
  const navigate = useNavigate()
  const toast = useToast()
  const isMobile = useIsMobile(1024)

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: workOrders = [], isLoading: loadingWO } = useWorkOrders()
  const { data: allTrips = [], isLoading: loadingTrips } = useTripOrders()
  const { data: suggestionsData, isLoading: loadingSuggestions } = useSuggestMatches(jobId)
  const { data: routes = [] } = useRoutes()

  // Route lookup map: route string → { pickupLocation, dropoffLocation }
  const routeMap = useMemo(() =>
    new Map(routes.map(r => [r.route, { pickup: r.pickupLocation ?? '', dropoff: r.dropoffLocation ?? '' }])),
    [routes]
  )

  const updateWorkOrder = useUpdateWorkOrder()
  const updateTripOrder = useUpdateTripOrder()
  const createTripOrder = useCreateTripOrder()

  const loading = loadingWO || loadingTrips

  // ── Work order (left panel) ───────────────────────────────────────────────
  const workOrder = useMemo(() => workOrders.find(w => w.id === jobId), [workOrders, jobId])

  // Local editable state for the work order
  const [woClient, setWoClient] = useState('')
  const [woRoute, setWoRoute] = useState('')
  const [woPickup, setWoPickup] = useState('')
  const [woDropoff, setWoDropoff] = useState('')
  const [woContainers, setWoContainers] = useState<{ workType: string; containerNumber: string }[]>([])
  const [woInitialized, setWoInitialized] = useState(false)

  // Initialize local state once work order loads
  useMemo(() => {
    if (workOrder && !woInitialized) {
      setWoClient(workOrder.clientName)
      setWoRoute(workOrder.route)
      // Resolve pickup/dropoff: prefer WO's own fields, fall back to route table
      const resolved = routeMap.get(workOrder.route)
      setWoPickup(workOrder.pickupLocation || resolved?.pickup || '')
      setWoDropoff(workOrder.dropoffLocation || resolved?.dropoff || '')
      setWoContainers(workOrder.containers.map(c => ({ workType: c.workType, containerNumber: c.containerNumber })))
      setWoInitialized(true)
    }
  }, [workOrder, woInitialized, routeMap])

  const updateWoContainer = useCallback((idx: number, field: 'workType' | 'containerNumber', value: string) => {
    setWoContainers(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }, [])

  // ── Trip orders (right panel) ─────────────────────────────────────────────
  // Use suggestions from the API — already ranked by match score, includes any 1-field match
  const suggestions = suggestionsData?.suggestions ?? []

  // ── Selected trip (right panel click) ────────────────────────────────────
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)

  // Auto-select best suggestion on load
  useMemo(() => {
    if (selectedTripId === null && suggestions.length > 0) {
      setSelectedTripId(suggestions[0].tripOrder.id)
    }
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

  useMemo(() => {
    if (selectedTrip && selectedTrip.id !== tripInitKey) {
      setTripClient(selectedTrip.clientName)
      setTripRoute(selectedTrip.route)
      // Resolve pickup/dropoff from route table when trip fields are empty
      const resolved = routeMap.get(selectedTrip.route)
      setTripPickup(selectedTrip.pickupLocation || resolved?.pickup || '')
      setTripDropoff(selectedTrip.dropoffLocation || resolved?.dropoff || '')
      setTripContainers(
        (selectedTrip.containers?.length
          ? selectedTrip.containers
          : selectedTrip.containerNumber
          ? [{ workType: selectedTrip.workType ?? 'E20', containerNumber: selectedTrip.containerNumber }]
          : []
        ).map(c => ({ workType: c.workType, containerNumber: c.containerNumber }))
      )
      setTripInitKey(selectedTrip.id)
    }
  }, [selectedTrip, tripInitKey, routeMap])

  const updateTripContainer = useCallback((idx: number, field: 'workType' | 'containerNumber', value: string) => {
    setTripContainers(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }, [])

  // ── Match computation ─────────────────────────────────────────────────────
  // Get matched_fields from the selected suggestion (backend already resolved route→pickup/dropoff)
  const selectedSuggestion = useMemo(
    () => suggestions.find(s => s.tripOrder.id === selectedTripId) ?? null,
    [suggestions, selectedTripId]
  )
  const backendMatchedFields = useMemo(
    () => new Set(selectedSuggestion?.matchedFields ?? []),
    [selectedSuggestion]
  )

  // Container match: check locally (user may have edited values)
  const matchedWoIndices = useMemo(() => {
    if (!selectedTrip) return new Set<number>()
    const tripSet = new Set(tripContainers.map(c => `${c.workType}|${c.containerNumber}`))
    return new Set(
      woContainers
        .map((c, i) => tripSet.has(`${c.workType}|${c.containerNumber}`) ? i : -1)
        .filter(i => i >= 0)
    )
  }, [woContainers, tripContainers, selectedTrip])

  const allContsMatch = woContainers.length > 0 && matchedWoIndices.size === woContainers.length
  // For non-container fields, trust backend matched_fields (they resolve route→pickup/dropoff)
  // but also check locally in case user edited values
  const clientMatch = backendMatchedFields.has('client') || (woClient !== '' && woClient === tripClient)
  const pickupMatch = backendMatchedFields.has('pickup_location') || (woPickup !== '' && woPickup === tripPickup)
  const dropoffMatch = backendMatchedFields.has('dropoff_location') || (woDropoff !== '' && woDropoff === tripDropoff)
  const allMatch = allContsMatch && clientMatch && pickupMatch && dropoffMatch

  // ── Submit ────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)

  const handleMatch = async () => {
    if (!workOrder || !selectedTrip || submitting) return
    setSubmitting(true)
    try {
      await updateWorkOrder.mutateAsync({
        id: workOrder.id,
        data: {
          clientName: woClient,
          route: woRoute,
          containers: woContainers.map(c => ({ containerNumber: c.containerNumber, workType: c.workType as WorkType, photoUrl: '' })),
        },
      })
      await updateTripOrder.mutateAsync({
        id: selectedTrip.id,
        data: {
          clientName: tripClient,
          route: tripRoute,
          containers: tripContainers.map(c => ({ containerNumber: c.containerNumber, workType: c.workType as WorkType })),
        },
      })
      await createTripOrder.mutateAsync({
        tripDate: selectedTrip.tripDate,
        clientId: selectedTrip.clientId,
        clientName: tripClient,
        route: tripRoute,
        containers: tripContainers.map(c => ({ containerNumber: c.containerNumber, workType: c.workType as WorkType })),
        pricingId: selectedTrip.pricingId,
        unitPrice: selectedTrip.unitPrice,
        driverSalary: selectedTrip.driverSalary,
        allowance: selectedTrip.allowance,
        revenue: selectedTrip.unitPrice,
        matchedWorkOrderIds: [workOrder.id],
        isConfirmed: false,
      })
      toast.success('Thành công', 'Đã khớp chuyến thành công')
      navigate(-1)
    } catch {
      toast.error('Lỗi', 'Không thể khớp chuyến')
      setSubmitting(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-40 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không tìm thấy chuyến</p>
        <button onClick={() => navigate(-1)} className="text-sm font-medium" style={{ color: 'var(--theme-brand-primary)' }}>
          Quay lại
        </button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: isMobile ? 'calc(100dvh - 56px)' : '100vh' }}>

      {/* ── Top bar ── */}
      <div
        className="flex items-center gap-3 px-4 lg:px-6 py-3 shrink-0 border-b"
        style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg transition-colors"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="typo-h2 truncate" style={{ color: 'var(--theme-text-primary)' }}>Đối soát phiếu</h1>
          <p className="typo-meta" style={{ color: 'var(--theme-text-muted)' }}>
            {workOrder.driverName} · {workOrder.containers.map(c => c.containerNumber).join(', ')}
          </p>
        </div>
        {/* Confirm button — top bar on desktop */}
        {!isMobile && selectedTrip && (
          <button
            onClick={handleMatch}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            <Check className="w-4 h-4" />
            {submitting ? 'Đang khớp...' : 'Xác nhận khớp'}
          </button>
        )}
      </div>

      {/* ── Two-panel body ── */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

        {/* ════════════════════════════════════════════════════════════════
            LEFT PANEL — Chuyến đã đi (work order detail)
        ════════════════════════════════════════════════════════════════ */}
        <div
          className="lg:w-[400px] xl:w-[440px] shrink-0 flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r"
          style={{ borderColor: 'var(--theme-border-light)' }}
        >
          {/* Panel header */}
          <div
            className="px-4 lg:px-5 py-3 shrink-0 flex items-center gap-2 border-b"
            style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-light)' }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--theme-brand-primary)' }} />
            <span className="typo-label" style={{ color: 'var(--theme-brand-primary)' }}>Chuyến đã đi</span>
            <div className="ml-auto flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{workOrder.driverName}</span>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-4">

            {/* Match status banner */}
            {selectedTrip && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                style={{
                  background: allMatch
                    ? 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)'
                    : 'color-mix(in srgb, var(--theme-status-warning) 12%, transparent)',
                  border: `1px solid ${allMatch ? 'var(--theme-status-success)' : 'var(--theme-status-warning)'}`,
                }}
              >
                {allMatch ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-success)' }} />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-warning)' }} />
                )}
                <span className="text-xs font-medium" style={{ color: allMatch ? 'var(--theme-status-success)' : 'var(--theme-status-warning)' }}>
                  {allMatch
                    ? 'Tất cả thông tin khớp — sẵn sàng xác nhận'
                    : [
                        `${matchedWoIndices.size}/${woContainers.length} container khớp`,
                        !clientMatch && 'khách hàng chưa khớp',
                        !pickupMatch && 'điểm lấy chưa khớp',
                        !dropoffMatch && 'điểm trả chưa khớp',
                      ].filter(Boolean).join(' · ')
                  }
                </span>
              </div>
            )}

            {/* Containers section */}
            <div>
              <div className="flex items-center justify-between mb-2">
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
              <div className="space-y-2">
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
            </div>

            {/* Info fields */}
            <div className="space-y-2">
              <InlineField
                label="Khách hàng"
                value={woClient}
                onChange={setWoClient}
                placeholder="Chưa có"
                matched={selectedTrip ? clientMatch : undefined}
              />
              <InlineField
                label="Điểm lấy"
                value={woPickup}
                onChange={setWoPickup}
                placeholder="—"
                matched={selectedTrip ? pickupMatch : undefined}
              />
              <InlineField
                label="Điểm trả"
                value={woDropoff}
                onChange={setWoDropoff}
                placeholder="—"
                matched={selectedTrip ? dropoffMatch : undefined}
              />
            </div>

          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            RIGHT PANEL — Đơn hàng (trip orders)
        ════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Panel header */}
          <div
            className="px-4 lg:px-5 py-3 shrink-0 flex items-center gap-2 border-b"
            style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--theme-status-warning)' }} />
            <span className="typo-label" style={{ color: 'var(--theme-status-warning)' }}>Đơn hàng</span>
            <span
              className="typo-caption px-2 py-0.5 rounded"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
            >
              {suggestions.length}
            </span>
            {loadingSuggestions && (
              <span className="flex items-center gap-1 typo-caption" style={{ color: 'var(--theme-text-muted)' }}>
                <Sparkles className="w-3 h-3 animate-pulse" /> Đang phân tích...
              </span>
            )}
            {suggestions.length > 0 && !loadingSuggestions && (
              <span className="flex items-center gap-1 typo-caption px-2 py-0.5 rounded" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
                <Sparkles className="w-3 h-3" /> {suggestions.length} đơn tiềm năng
              </span>
            )}
          </div>

          {/* Trip list */}
          <div className="flex-1 overflow-y-auto">
            {suggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-3">
                <FileText className="w-10 h-10" style={{ color: 'var(--theme-text-muted)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                  {loadingSuggestions ? 'Đang tìm đơn hàng phù hợp...' : 'Không tìm thấy đơn hàng phù hợp'}
                </p>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Tạo đơn hàng mới để bắt đầu đối soát</p>
                <button
                  onClick={() => navigate('/accountant/create-trip', { state: { fromWorkOrder: workOrder } })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                >
                  <Plus className="w-4 h-4" /> Tạo đơn mới
                </button>
              </div>
            ) : (
              <>
                {/* Section label */}
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--theme-brand-primary)' }}>
                    <Sparkles className="w-3 h-3" /> Đơn hàng tiềm năng
                  </p>
                </div>
                {suggestions.map(s => (
                  <TripRow
                    key={s.tripOrder.id}
                    trip={s.tripOrder}
                    isSelected={selectedTripId === s.tripOrder.id}
                    matchedCount={(s.tripOrder.containers ?? []).filter(tc =>
                      woContainers.some(wc => wc.containerNumber === tc.containerNumber)
                    ).length}
                    totalWoConts={woContainers.length}
                    score={Math.round(s.score * 100)}
                    confidence={s.confidence}
                    onClick={() => setSelectedTripId(s.tripOrder.id)}
                  />
                ))}
              </>
            )}
          </div>

          {/* Selected trip detail / edit panel */}
          {selectedTrip && (
            <div
              className="shrink-0 border-t p-4 lg:p-5 space-y-3"
              style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-secondary)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
                  Chỉnh sửa đơn đã chọn
                </span>
                <button
                  onClick={() => setSelectedTripId(null)}
                  className="p-1 rounded"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Trip containers */}
              <div className="space-y-1.5">
                {tripContainers.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={c.workType}
                      onChange={e => updateTripContainer(idx, 'workType', e.target.value.toUpperCase())}
                      className="w-14 px-2 py-1.5 rounded text-xs font-bold text-center border"
                      style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-primary)', color: 'var(--theme-brand-primary)' }}
                    />
                    <input
                      value={c.containerNumber}
                      onChange={e => updateTripContainer(idx, 'containerNumber', e.target.value.toUpperCase())}
                      className="flex-1 px-2 py-1.5 rounded text-xs font-mono border"
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
                ))}
                <button
                  onClick={() => setTripContainers(prev => [...prev, { workType: 'E20', containerNumber: '' }])}
                  className="text-xs font-medium flex items-center gap-1 px-2 py-1 rounded"
                  style={{ color: 'var(--theme-brand-primary)', background: 'var(--theme-brand-primary-light)' }}
                >
                  <Plus className="w-3 h-3" /> Thêm container
                </button>
              </div>

              {/* Trip info fields */}
              <div className="grid grid-cols-2 gap-3">
                <InlineField label="Khách hàng" value={tripClient} onChange={setTripClient} />
                <InlineField label="Điểm lấy" value={tripPickup} onChange={setTripPickup} />
                <InlineField label="Điểm trả" value={tripDropoff} onChange={setTripDropoff} />
              </div>

              {/* Confirm button — bottom on mobile */}
              {isMobile && (
                <button
                  onClick={handleMatch}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-60"
                  style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                >
                  <Check className="w-4 h-4" />
                  {submitting ? 'Đang khớp...' : 'Xác nhận khớp chuyến'}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
