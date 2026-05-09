import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandIcon } from '@/components/atoms/BrandIcon'
import {
  useWorkOrders,
  useTripOrders,
  useDashboardSummary,
  useUpdateWorkOrder,
  useUpdateTripOrder,
  useSuggestMatches,
} from '@/hooks/use-queries'
import { useIsMobile } from '@/hooks/use-mobile'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { StatsGrid } from '@/components/shared/StatsGrid'
import { StatusBadgePro } from '@/components/shared/StatusBadgePro'
import { EditDialog } from '@/components/shared/EditDialog'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { useMonthParams } from './use-month-params'
import { formatCurrencyFull as fmt, type WorkOrder, type TripOrder } from '@/data/domain'
import {
  ArrowRight,
  CheckCircle2, Plus, Wallet, Tag, Users,
  FileText, Truck, Car, Briefcase, DollarSign, Clock, AlertTriangle,
  Calendar, User, Pencil,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveRoute(wo: WorkOrder | TripOrder): string {
  const parts = wo.route.split(' - ')
  const from = wo.pickupLocation?.name || parts[0] || wo.route
  const to = wo.dropoffLocation?.name || parts[1] || null
  return to ? `${from} → ${to}` : from
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  text,
  illustrated = false,
}: {
  icon: React.ElementType
  text: string
  /** Use the branded calkey illustration instead of the icon chip. */
  illustrated?: boolean
}) {
  if (illustrated) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <BrandIcon name="calkey" className="w-24 h-24 opacity-90" />
        <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{text}</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)' }}
      >
        <Icon className="h-7 w-7" style={{ color: 'var(--theme-brand-primary)' }} />
      </div>
      <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{text}</p>
    </div>
  )
}

// ─── Workbench column card ────────────────────────────────────────────────────

function WorkbenchCard({
  title, titleExtra, footerLabel, onFooter, children, minHeight = '320px',
}: {
  title: React.ReactNode
  titleExtra?: React.ReactNode
  footerLabel?: string
  onFooter?: () => void
  children: React.ReactNode
  minHeight?: string
}) {
  return (
    <div
      className="flex flex-col rounded-lg border overflow-hidden"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3"
        style={{ borderBottom: '1px solid var(--theme-border-default)' }}
      >
        <div className="typo-h2" style={{ color: 'var(--theme-text-primary)' }}>
          {title}
        </div>
        {titleExtra}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ minHeight }}>
        {children}
      </div>

      {/* Footer */}
      {footerLabel && onFooter && (
        <div style={{ borderTop: '1px solid var(--theme-border-default)' }}>
          <button
            onClick={onFooter}
            className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold transition hover:opacity-70"
            style={{ color: 'var(--theme-brand-primary)' }}
          >
            {footerLabel} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Trip order row ───────────────────────────────────────────────────────────

function TripRow({ trip, onClick, isLast }: { trip: TripOrder; onClick: () => void; isLast?: boolean }) {
  const isPending = trip.status === 'PENDING' || trip.status === 'DRAFT'
  const isConfirmed = trip.isConfirmed
  const isDraft = trip.status === 'DRAFT'

  const types = trip.containers.length > 0
    ? (() => {
        const map: Record<string, number> = {}
        trip.containers.forEach(c => { map[c.workType] = (map[c.workType] ?? 0) + 1 })
        return Object.entries(map).map(([t, n]) => n > 1 ? `${t} × ${n}` : t).join(' ')
      })()
    : ''

  const tripDate = trip.tripDate
    ? new Date(trip.tripDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  let statusVariant: 'success' | 'warning' | 'neutral' | 'completed' | 'draft' | 'pending' | 'matched' = 'neutral'
  let statusLabel = ''

  if (isConfirmed) {
    statusVariant = 'success'
    statusLabel = 'Đã xác nhận'
  } else if (isDraft) {
    statusVariant = 'draft'
    statusLabel = 'Nháp'
  } else if (trip.status === 'COMPLETED') {
    statusVariant = 'completed'
    statusLabel = 'Hoàn thành'
  } else if (isPending) {
    statusVariant = 'pending'
    statusLabel = 'Chờ xử lý'
  } else {
    statusVariant = 'matched'
    statusLabel = 'Đã ghép'
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 transition hover:bg-[color-mix(in_srgb,var(--theme-brand-primary)_4%,transparent)] active:scale-[0.99] touch-manipulation"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
          {trip.code ? `${trip.code} · ` : ''}{trip.client.name}
        </span>
        <StatusBadgePro variant={statusVariant} label={statusLabel} size="sm" />
      </div>
      <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>
        {tripDate}{tripDate && ' | '}{resolveRoute(trip)}
      </p>
      {types && (
        <div className="mt-1.5 flex items-center gap-3">
          {types && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              <Car className="h-3 w-3" />
              {types}
            </span>
          )}
        </div>
      )}
    </button>
  )
}

// ─── Unmatched WO row ─────────────────────────────────────────────────────────

function UnmatchedRow({ wo, onClick, isLast }: { wo: WorkOrder; onClick: () => void; isLast?: boolean }) {
  const containerNums = wo.containers.map(c => c.containerNumber).filter(Boolean).slice(0, 1).join(', ')

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 transition hover:bg-[color-mix(in_srgb,var(--theme-brand-primary)_4%,transparent)] active:scale-[0.99] touch-manipulation"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
          {wo.code} · {wo.driver.name}
        </span>
        <StatusBadgePro variant="warning" label="Chờ ghép" size="sm" />
      </div>
      <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>
        {wo.client.name} | {resolveRoute(wo)}
      </p>
      <div className="mt-1.5 flex items-center gap-3">
        {wo.tractorPlate && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Truck className="h-3 w-3" />
            {wo.tractorPlate}
          </span>
        )}
        {wo.containers[0]?.workType && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Car className="h-3 w-3" />
            {wo.containers[0].workType}
          </span>
        )}
        {containerNums && (
          <span className="text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
            {containerNums}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Chuyến đã đi card (left column — WorkOrder) ─────────────────────────────

function ChuyenCard({
  wo,
  isSelected,
  onClick,
  onEdit,
}: {
  wo: WorkOrder
  isSelected?: boolean
  onClick: () => void
  onEdit: (e: React.MouseEvent) => void
}) {
  const containerNums = wo.containers.map(c => c.containerNumber).filter(Boolean).slice(0, 2).join(', ')
  const types = wo.containers.length > 0
    ? (() => {
        const map: Record<string, number> = {}
        wo.containers.forEach(c => { map[c.workType] = (map[c.workType] ?? 0) + 1 })
        return Object.entries(map).map(([t, n]) => n > 1 ? `${t}×${n}` : t).join(' ')
      })()
    : ''

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="w-full text-left rounded-lg p-3 transition-all touch-manipulation cursor-pointer"
      style={{
        background: isSelected
          ? 'color-mix(in srgb, var(--theme-brand-primary) 12%, var(--theme-bg-primary))'
          : 'var(--theme-bg-primary)',
        border: `1.5px solid ${isSelected ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
      }}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--theme-text-primary)' }}>
          {wo.driver.name}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(e)
          }}
          className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition hover:opacity-70"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
          aria-label="Sửa phiếu"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
      <p className="text-xs truncate mb-1.5" style={{ color: 'var(--theme-text-secondary)' }}>
        {wo.client.name} · {resolveRoute(wo)}
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {wo.tractorPlate && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Truck className="h-3 w-3 shrink-0" />
            {wo.tractorPlate}
          </span>
        )}
        {types && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Car className="h-3 w-3 shrink-0" />
            {types}
          </span>
        )}
        {containerNums && (
          <span className="text-xs font-mono truncate" style={{ color: 'var(--theme-text-muted)' }}>
            {containerNums}
          </span>
        )}
      </div>
      {isSelected && (
        <p className="mt-1.5 text-[10px] font-bold" style={{ color: 'var(--theme-brand-primary)' }}>
          ✓ Đang xem gợi ý
        </p>
      )}
    </div>
  )
}

// ─── Đơn hàng card (right column — TripOrder) ────────────────────────────────

function DonHangCard({
  trip,
  matchScore,
  matchConfidence,
  onEdit,
  onNavigate,
}: {
  trip: TripOrder
  matchScore?: number
  matchConfidence?: 'full' | 'partial' | 'none'
  onEdit: (e: React.MouseEvent) => void
  onNavigate?: () => void
}) {
  const tripDate = trip.tripDate
    ? new Date(trip.tripDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : null
  const types = trip.containers.length > 0
    ? (() => {
        const map: Record<string, number> = {}
        trip.containers.forEach(c => { map[c.workType] = (map[c.workType] ?? 0) + 1 })
        return Object.entries(map).map(([t, n]) => n > 1 ? `${t}×${n}` : t).join(' ')
      })()
    : ''

  const isFull = matchConfidence === 'full'
  const isPartial = matchConfidence === 'partial'
  const isHighlighted = isFull || isPartial

  return (
    <div
      className="rounded-xl p-3 transition-all"
      style={{
        background: isFull
          ? 'color-mix(in srgb, var(--theme-status-success) 8%, var(--theme-bg-primary))'
          : isPartial
          ? 'color-mix(in srgb, var(--theme-status-warning) 8%, var(--theme-bg-primary))'
          : 'var(--theme-bg-primary)',
        border: `1.5px solid ${
          isFull
            ? 'var(--theme-status-success)'
            : isPartial
            ? 'var(--theme-status-warning)'
            : 'var(--theme-border-default)'
        }`,
      }}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--theme-text-primary)' }}>
          {trip.code ? `${trip.code} · ` : ''}{trip.client.name}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {isHighlighted && matchScore !== undefined && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: isFull ? 'var(--theme-status-success)' : 'var(--theme-status-warning)',
                color: 'white',
              }}
            >
              {Math.round(matchScore)}%
            </span>
          )}
          <button
            onClick={onEdit}
            className="flex items-center justify-center w-6 h-6 rounded-md transition hover:opacity-70"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
            aria-label="Sửa đơn hàng"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      </div>
      <p className="text-xs truncate mb-1.5" style={{ color: 'var(--theme-text-secondary)' }}>
        {resolveRoute(trip)}
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {tripDate && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Calendar className="h-3 w-3 shrink-0" />
            {tripDate}
          </span>
        )}
        {types && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Car className="h-3 w-3 shrink-0" />
            {types}
          </span>
        )}
      </div>
      {isHighlighted && onNavigate && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={onNavigate}
            className="text-[10px] font-bold px-2 py-1 rounded-lg transition hover:opacity-80 active:scale-[0.97]"
            style={{
              background: isFull ? 'var(--theme-status-success)' : 'var(--theme-status-warning)',
              color: 'white',
            }}
          >
            Ghép ngay →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Gợi ý ghép chuyến panel ───────────────────────────────────────────────────

function MatchSuggestionPanel({
  workOrders,
  trips,
  onNavigate,
}: {
  workOrders: WorkOrder[]  // left — chuyến đã đi (driver trips)
  trips: TripOrder[]       // right — đơn hàng (accountant orders)
  onNavigate: (woId: number) => void
}) {
  const updateWO = useUpdateWorkOrder()
  const updateTrip = useUpdateTripOrder()

  // Selected WorkOrder id (left column click)
  const [selectedWoId, setSelectedWoId] = useState<number | null>(null)

  // Edit state — work order (left)
  const [editWO, setEditWO] = useState<WorkOrder | null>(null)
  const [woClient, setWoClient] = useState('')
  const [woRoute, setWoRoute] = useState('')
  const [woDriver, setWoDriver] = useState('')

  // Edit state — trip order (right)
  const [editTrip, setEditTrip] = useState<TripOrder | null>(null)
  const [tripClient, setTripClient] = useState('')
  const [tripRoute, setTripRoute] = useState('')

  // Fetch TripOrder suggestions for the selected WorkOrder
  const { data: suggestData, isLoading: loadingSuggestions } = useSuggestMatches(selectedWoId)

  // Build tripId → match info from backend response
  const backendMatchMap = useMemo(() => {
    const map = new Map<number, { score: number; confidence: 'full' | 'partial' | 'none' }>()
    if (suggestData?.suggestions) {
      for (const s of suggestData.suggestions) {
        map.set(s.tripOrder.id, {
          score: Math.min(100, Math.round((s.score ?? 0) * 100)),
          confidence: s.confidence,
        })
      }
    }
    return map
  }, [suggestData])

  // Client-side fallback scoring (WO → TripOrders) while backend responds
  const tripMatchMap = useMemo(() => {
    if (backendMatchMap.size > 0) return backendMatchMap
    if (!selectedWoId) return new Map<number, { score: number; confidence: 'full' | 'partial' | 'none' }>()

    const wo = workOrders.find(w => w.id === selectedWoId)
    if (!wo) return new Map()

    const map = new Map<number, { score: number; confidence: 'full' | 'partial' | 'none' }>()
    const woRouteLower = wo.route.toLowerCase()
    const woClientLower = wo.client.name.toLowerCase()
    const woContainers = new Set(wo.containers.map(c => c.containerNumber?.toLowerCase()).filter(Boolean))
    const woTypes = new Set(wo.containers.map(c => c.workType))

    for (const trip of trips) {
      let matched = 0
      const total = 3

      if (trip.client.name.toLowerCase() === woClientLower) matched++
      if (trip.route.toLowerCase() === woRouteLower) matched++

      const tripContainers = new Set(trip.containers.map(c => c.containerNumber?.toLowerCase()).filter(Boolean))
      const hasContainerMatch = [...woContainers].some(cn => tripContainers.has(cn))
      if (hasContainerMatch) matched++

      const tripTypes = new Set(trip.containers.map(c => c.workType))
      const hasTypeMatch = [...woTypes].some(t => tripTypes.has(t))
      if (!hasContainerMatch && hasTypeMatch) matched += 0.5

      const score = (matched / total) * 100
      if (score >= 50) {
        map.set(trip.id, {
          score,
          confidence: score >= 100 ? 'full' : score >= 75 ? 'partial' : 'none',
        })
      }
    }
    return map
  }, [selectedWoId, workOrders, trips, backendMatchMap])

  // Sort trips: highlighted first
  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      const sa = tripMatchMap.get(a.id)?.score ?? 0
      const sb = tripMatchMap.get(b.id)?.score ?? 0
      return sb - sa
    })
  }, [trips, tripMatchMap])

  const openEditWO = (e: React.MouseEvent, wo: WorkOrder) => {
    e.stopPropagation()
    setWoClient(wo.client.name)
    setWoRoute(wo.route)
    setWoDriver(wo.driver.name)
    setEditWO(wo)
  }

  const saveWO = () => {
    if (!editWO) return
    updateWO.mutate({ id: editWO.id, data: { route: woRoute } })
    setEditWO(null)
  }

  const openEditTrip = (e: React.MouseEvent, trip: TripOrder) => {
    e.stopPropagation()
    setTripClient(trip.client.name)
    setTripRoute(trip.route)
    setEditTrip(trip)
  }

  const saveTrip = () => {
    if (!editTrip) return
    updateTrip.mutate({ id: editTrip.id, data: { route: tripRoute } })
    setEditTrip(null)
  }

  if (workOrders.length === 0 && trips.length === 0) {
    return <EmptyState icon={CheckCircle2} text="Tất cả phiếu đã ghép" />
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-0 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Left: Chuyến đã đi (WorkOrders) */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ borderRight: '1px solid var(--theme-border-default)' }}
        >
          <div
            className="px-3 py-2 shrink-0"
            style={{ borderBottom: '1px solid var(--theme-border-light)', background: 'var(--theme-bg-tertiary)' }}
          >
            <p className="typo-label">
              Chuyến đã đi ({workOrders.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {workOrders.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--theme-text-muted)' }}>Không có chuyến</p>
            ) : (
              workOrders.map(wo => (
                <ChuyenCard
                  key={wo.id}
                  wo={wo}
                  isSelected={selectedWoId === wo.id}
                  onClick={() => setSelectedWoId(prev => prev === wo.id ? null : wo.id)}
                  onEdit={e => openEditWO(e, wo)}
                />
              ))
            )}
            {workOrders.length > 0 && !selectedWoId && (
              <p className="text-[11px] text-center pt-1 pb-2" style={{ color: 'var(--theme-text-muted)' }}>
                ☝️ Nhấn vào chuyến để tìm gợi ý
              </p>
            )}
          </div>
        </div>

        {/* Right: Đơn hàng (TripOrders) */}
        <div className="flex flex-col overflow-hidden">
          <div
            className="px-3 py-2 shrink-0"
            style={{ borderBottom: '1px solid var(--theme-border-light)', background: 'var(--theme-bg-tertiary)' }}
          >
            <p className="typo-label">
              Đơn hàng ({trips.length})
              {selectedWoId && !loadingSuggestions && tripMatchMap.size > 0 && (
                <span className="ml-1.5 font-normal normal-case" style={{ color: 'var(--theme-status-warning)' }}>
                  · {tripMatchMap.size} gợi ý
                </span>
              )}
              {selectedWoId && loadingSuggestions && (
                <span className="ml-1.5 font-normal normal-case" style={{ color: 'var(--theme-text-muted)' }}>
                  · đang tìm…
                </span>
              )}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {trips.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--theme-text-muted)' }}>Không có đơn hàng</p>
            ) : selectedWoId && !loadingSuggestions && tripMatchMap.size === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 px-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ background: 'color-mix(in srgb, var(--theme-status-warning) 12%, transparent)' }}
                >
                  <AlertTriangle className="h-5 w-5" style={{ color: 'var(--theme-status-warning)' }} />
                </div>
                <p className="text-xs font-semibold text-center" style={{ color: 'var(--theme-text-primary)' }}>
                  Không tìm thấy đơn hàng phù hợp
                </p>
                <p className="text-[11px] text-center" style={{ color: 'var(--theme-text-muted)' }}>
                  Thử chỉnh sửa thông tin chuyến hoặc đối soát thủ công
                </p>
              </div>
            ) : (
              sortedTrips.map(trip => {
                const match = tripMatchMap.get(trip.id)
                return (
                  <DonHangCard
                    key={trip.id}
                    trip={trip}
                    matchScore={match?.score}
                    matchConfidence={match?.confidence}
                    onEdit={e => openEditTrip(e, trip)}
                    onNavigate={match && selectedWoId ? () => onNavigate(selectedWoId) : undefined}
                  />
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Edit: Work Order (left) */}
      <EditDialog open={!!editWO} title="Sửa chuyến đã đi" color="var(--theme-brand-primary)" onClose={saveWO}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
          <Input value={woClient} onChange={e => setWoClient(e.target.value)} className="text-sm h-10" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
          <Input value={woRoute} onChange={e => setWoRoute(e.target.value)} className="text-sm h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Tài xế</Label>
          <Input value={woDriver} onChange={e => setWoDriver(e.target.value)} className="text-sm h-10" />
        </div>
      </EditDialog>

      {/* Edit: Trip Order (right) */}
      <EditDialog open={!!editTrip} title="Sửa đơn hàng" color="var(--theme-status-warning)" onClose={saveTrip}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
          <Input value={tripClient} onChange={e => setTripClient(e.target.value)} className="text-sm h-10" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
          <Input value={tripRoute} onChange={e => setTripRoute(e.target.value)} className="text-sm h-10" />
        </div>
      </EditDialog>
    </>
  )
}

// ─── Desktop dashboard ────────────────────────────────────────────────────────

function DesktopDashboard() {
  const navigate = useNavigate()
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()

  const { data: workOrders = [] } = useWorkOrders({ dateFrom, dateTo })
  const { data: trips = [] } = useTripOrders({ dateFrom, dateTo })
  const { data: summary } = useDashboardSummary()

  const pendingWOs = useMemo(() => workOrders.filter(w => w.status === 'PENDING'), [workOrders])
  const totalDriverSalary = useMemo(() => workOrders.reduce((s, w) => s + (w.earning ?? 0), 0), [workOrders])
  const revenue = summary?.totalRevenue ?? trips.reduce((s, t) => s + (t.revenue ?? 0), 0)
  const pendingTrips = trips.filter(t => t.status === 'PENDING' || t.status === 'DRAFT')
  const completedTrips = trips.filter(t => t.status === 'COMPLETED')

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [trips],
  )
  const unmatchedWOs = useMemo(
    () => workOrders.filter(w => w.status !== 'MATCHED' && w.status !== 'COMPLETED').slice(0, 10),
    [workOrders],
  )
  // KPI cards — prioritise what kế toán acts on first
  const stats = [
    {
      label: 'Chuyến chưa ghép',
      value: String(pendingWOs.length),
      valueColor: pendingWOs.length > 0 ? 'var(--theme-status-warning)' : undefined,
      icon: <AlertTriangle className="h-5 w-5" />,
      onClick: () => navigate('/accountant/work-orders'),
    },
    {
      label: 'Đơn chờ đối soát',
      value: String(pendingTrips.length),
      valueColor: pendingTrips.length > 0 ? 'var(--theme-status-warning)' : undefined,
      icon: <Clock className="h-5 w-5" />,
      onClick: () => navigate('/accountant/trips'),
    },
    {
      label: 'Lương sản lượng TX',
      value: fmt(totalDriverSalary),
      icon: <Wallet className="h-5 w-5" />,
      onClick: () => navigate('/accountant/salary-setup'),
    },
    {
      label: 'Doanh thu tháng',
      value: fmt(revenue),
      icon: <DollarSign className="h-5 w-5" />,
      onClick: () => navigate('/accountant/trips'),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typo-display">Tổng quan</h1>
          <p className="typo-body-sm mt-1">Tháng {month}/{year}</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
        </div>
      </div>

      {/* KPI grid */}
      <StatsGrid stats={stats} columns={4} />

      {/* 2-column: unmatched drivers (left, primary) + recent orders (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Chuyến chưa ghép — kế toán's primary daily task */}
        <div className="card p-4 flex flex-col" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: 'var(--theme-status-warning)' }} />
            <h2 className="typo-h2" style={{ color: 'var(--theme-text-primary)' }}>Chuyến chưa ghép</h2>
            {pendingWOs.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold" style={{ background: 'var(--theme-status-warning)', color: '#fff' }}>
                {pendingWOs.length}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: '320px' }}>
            {unmatchedWOs.length === 0 ? (
              <EmptyState icon={CheckCircle2} text="Tất cả phiếu đã ghép xong" />
            ) : (
              unmatchedWOs.map((wo, i) => (
                <UnmatchedRow key={wo.id} wo={wo} isLast={i === unmatchedWOs.length - 1} onClick={() => navigate(`/accountant/match/${wo.id}`)} />
              ))
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--theme-border-default)', paddingTop: 12, marginTop: 12 }}>
            <button onClick={() => navigate('/accountant/work-orders')} className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold transition hover:opacity-70" style={{ color: 'var(--theme-brand-primary)' }}>
              Mở trang Ghép chuyến <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Đơn hàng gần đây */}
        <div className="card p-4 flex flex-col" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
          <div className="mb-4">
            <h2 className="typo-h2" style={{ color: 'var(--theme-text-primary)' }}>Đơn hàng gần đây</h2>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: '320px' }}>
            {sortedTrips.length === 0 ? (
              <EmptyState icon={FileText} text="Chưa có lệnh nào" illustrated />
            ) : (
              sortedTrips.map((trip, i) => (
                <TripRow key={trip.id} trip={trip} isLast={i === sortedTrips.length - 1} onClick={() => navigate(`/accountant/trip/${trip.id}`)} />
              ))
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--theme-border-default)', paddingTop: 12, marginTop: 12 }}>
            <button onClick={() => navigate('/accountant/trips')} className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold transition hover:opacity-70" style={{ color: 'var(--theme-brand-primary)' }}>
              Xem tất cả đơn hàng <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Mobile dashboard ─────────────────────────────────────────────────────────

function MobileDashboard() {
  const navigate = useNavigate()
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const { data: workOrders = [] } = useWorkOrders({ dateFrom, dateTo })
  const { data: trips = [] } = useTripOrders({ dateFrom, dateTo })
  const { data: summary } = useDashboardSummary()

  const pendingWOs = useMemo(() => workOrders.filter(w => w.status === 'PENDING'), [workOrders])
  const totalDriverSalary = useMemo(() => workOrders.reduce((s, w) => s + (w.earning ?? 0), 0), [workOrders])
  const revenue = summary?.totalRevenue ?? trips.reduce((s, t) => s + (t.revenue ?? 0), 0)
  const pendingTrips = trips.filter(t => t.status === 'PENDING' || t.status === 'DRAFT')
  const recentTrips = useMemo(
    () => [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [trips],
  )
  const unmatchedWOs = useMemo(
    () => workOrders.filter(w => w.status !== 'MATCHED' && w.status !== 'COMPLETED').slice(0, 5),
    [workOrders],
  )

  const stats = [
    { label: 'Chuyến chưa ghép', value: String(pendingWOs.length), valueColor: pendingWOs.length > 0 ? 'var(--theme-status-warning)' : undefined, icon: <AlertTriangle className="h-5 w-5" />, onClick: () => navigate('/accountant/work-orders') },
    { label: 'Đơn chờ đối soát', value: String(pendingTrips.length), valueColor: pendingTrips.length > 0 ? 'var(--theme-status-warning)' : undefined, icon: <Clock className="h-5 w-5" />, onClick: () => navigate('/accountant/trips') },
    { label: 'Lương sản lượng TX', value: fmt(totalDriverSalary), icon: <Wallet className="h-5 w-5" />, onClick: () => navigate('/accountant/salary-setup') },
    { label: 'Doanh thu tháng', value: fmt(revenue), icon: <DollarSign className="h-5 w-5" />, onClick: () => navigate('/accountant/trips') },
  ]

  const quickActions = [
    { id: 'import', label: 'Nhập đơn', icon: <Plus className="h-4 w-4" />, onClick: () => navigate('/accountant/import-orders'), primary: true },
    { id: 'reconcile', label: 'Ghép chuyến', icon: <Briefcase className="h-4 w-4" />, onClick: () => navigate('/accountant/work-orders') },
    { id: 'partners', label: 'Nhà thầu', icon: <Users className="h-4 w-4" />, onClick: () => navigate('/accountant/partners') },
    { id: 'pricing', label: 'Bảng giá', icon: <Tag className="h-4 w-4" />, onClick: () => navigate('/accountant/pricing') },
    { id: 'salary', label: 'Kỳ lương', icon: <Wallet className="h-4 w-4" />, onClick: () => navigate('/accountant/salary-setup') },
  ]

  return (
    <div className="space-y-4 pb-8">
      {/* Month navigator */}
      <MonthNavigator
        year={year}
        month={month}
        onPrev={onPrev}
        onNext={onNext}
      />

      {/* KPI grid - 2x2 */}
      <StatsGrid stats={stats} columns={2} />

      {/* Quick actions - wraps to two rows when needed */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map(a => (
          <button
            key={a.id}
            onClick={a.onClick}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:opacity-80 active:scale-[0.97] touch-manipulation"
            style={{
              background: a.primary ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
              borderColor: a.primary ? 'transparent' : 'var(--theme-border-default)',
              color: a.primary ? 'white' : 'var(--theme-text-primary)',
            }}
          >
            <span style={{ color: a.primary ? 'white' : 'var(--theme-brand-primary)' }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* Đơn hàng */}
      <WorkbenchCard
        title="Đơn hàng"
        footerLabel="Xem tất cả lệnh"
        onFooter={() => navigate('/accountant/trips')}
        minHeight="200px"
      >
        {recentTrips.length === 0 ? (
          <EmptyState icon={FileText} text="Chưa có lệnh nào" illustrated />
        ) : (
          recentTrips.map((trip, i) => (
            <TripRow
              key={trip.id}
              trip={trip}
              isLast={i === recentTrips.length - 1}
              onClick={() => navigate(`/accountant/trip/${trip.id}`)}
            />
          ))
        )}
      </WorkbenchCard>

      {/* Phiếu tài xế chưa ghép */}
      <WorkbenchCard
        title="Chuyến chưa ghép"
        footerLabel="Mở trang Ghép chuyến"
        onFooter={() => navigate('/accountant/work-orders')}
        minHeight="200px"
      >
        {unmatchedWOs.length === 0 ? (
          <EmptyState icon={CheckCircle2} text="Không có phiếu chờ" />
        ) : (
          unmatchedWOs.map((wo, i) => (
            <UnmatchedRow
              key={wo.id}
              wo={wo}
              isLast={i === unmatchedWOs.length - 1}
              onClick={() => navigate(`/accountant/match/${wo.id}`)}
            />
          ))
        )}
      </WorkbenchCard>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function AccountantDashboard() {
  const isMobile = useIsMobile(1024)
  return isMobile ? <MobileDashboard /> : <DesktopDashboard />
}
