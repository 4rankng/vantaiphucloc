import { useMemo, useState } from 'react'
import { useUpdateDeliveredTrip, useUpdateBookedTrip, useSuggestMatches } from '@/hooks/use-queries'
import { EditDialog } from '@/components/shared/EditDialog'
import { formatDate } from '@/lib/format'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { resolveRoute } from '@/lib/route-utils'
import {
  AlertTriangle, Car, Calendar, Pencil, CheckCircle2,
} from 'lucide-react'
import type { DeliveredTrip, BookedTrip } from '@/data/domain'

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChuyenCard({
  wo, isSelected, onClick, onEdit,
}: {
  wo: DeliveredTrip
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
          {wo.driver ? `${wo.driver.name}${wo.driver.vehicle?.plate ? ` · ${wo.driver.vehicle.plate}` : ''}` : (wo.vehicleExternalPlate ? `Xe ngoài · ${wo.vehicleExternalPlate}` : 'Xe ngoài')}
        </p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(e) }}
          className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition hover:opacity-70"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
          aria-label="Sửa phiếu"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
      <p className="text-xs truncate mb-1.5" style={{ color: 'var(--theme-text-secondary)' }}>
        {resolveRoute(wo)}
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
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

function DonHangCard({
  trip, matchScore, matchConfidence, onEdit, onNavigate,
}: {
  trip: BookedTrip
  matchScore?: number
  matchConfidence?: 'full' | 'partial' | 'none'
  onEdit: (e: React.MouseEvent) => void
  onNavigate?: () => void
}) {
  const tripDate = trip.tripDate
    ? formatDate(trip.tripDate, 'short')
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
          {trip.partner.name}
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

// ─── Empty state helper ──────────────────────────────────────────────────────

function EmptyState({
  icon: Icon, text, illustrated = false,
}: {
  icon: React.ElementType
  text: string
  illustrated?: boolean
}) {
  if (illustrated) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <img src="/calkey.svg" alt="" className="w-24 h-24 opacity-90" />
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

// ─── Main component ──────────────────────────────────────────────────────────

export function MatchSuggestionPanel({
  deliveredTrips,
  trips,
  onNavigate,
}: {
  deliveredTrips: DeliveredTrip[]
  trips: BookedTrip[]
  onNavigate: (woId: number) => void
}) {
  const updateWO = useUpdateDeliveredTrip()
  const updateTrip = useUpdateBookedTrip()

  const [selectedWoId, setSelectedWoId] = useState<number | null>(null)

  // Edit state — work order
  const [editWO, setEditWO] = useState<DeliveredTrip | null>(null)
  const [woClient, setWoClient] = useState('')
  const [woRoute, setWoRoute] = useState('')
  const [woDriver, setWoDriver] = useState('')

  // Edit state — trip order
  const [editTrip, setEditTrip] = useState<BookedTrip | null>(null)
  const [tripClient, setTripClient] = useState('')
  const [tripRoute, setTripRoute] = useState('')

  const { data: suggestData, isLoading: loadingSuggestions } = useSuggestMatches(selectedWoId)

  const backendMatchMap = useMemo(() => {
    const map = new Map<number, { score: number; confidence: 'full' | 'partial' | 'none' }>()
    if (suggestData?.suggestions) {
      for (const s of suggestData.suggestions) {
        map.set(s.bookedTrip.id, {
          score: Math.min(100, Math.round((s.score ?? 0) * 100)),
          confidence: s.confidence,
        })
      }
    }
    return map
  }, [suggestData])

  const tripMatchMap = useMemo(() => {
    if (backendMatchMap.size > 0) return backendMatchMap
    if (!selectedWoId) return new Map<number, { score: number; confidence: 'full' | 'partial' | 'none' }>()

    const wo = deliveredTrips.find(w => w.id === selectedWoId)
    if (!wo) return new Map()

    const map = new Map<number, { score: number; confidence: 'full' | 'partial' | 'none' }>()
    const woRouteLower = wo.route.toLowerCase()
    const woClientLower = wo.partner.name.toLowerCase()
    const woContainers = new Set(wo.containers.map(c => c.containerNumber?.toLowerCase()).filter(Boolean))
    const woTypes = new Set(wo.containers.map(c => c.workType))

    for (const trip of trips) {
      let matched = 0
      const total = 3

      if (trip.partner.name.toLowerCase() === woClientLower) matched++
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
  }, [selectedWoId, deliveredTrips, trips, backendMatchMap])

  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      const sa = tripMatchMap.get(a.id)?.score ?? 0
      const sb = tripMatchMap.get(b.id)?.score ?? 0
      return sb - sa
    })
  }, [trips, tripMatchMap])

  const openEditWO = (e: React.MouseEvent, wo: DeliveredTrip) => {
    e.stopPropagation()
    setWoClient(wo.partner.name)
    setWoRoute(wo.route)
    setWoDriver(wo.driver?.name ?? wo.vehicleExternalPlate ?? 'Xe ngoài')
    setEditWO(wo)
  }

  const saveWO = () => {
    if (!editWO) return
    updateWO.mutate({ id: editWO.id, data: { route: woRoute } })
    setEditWO(null)
  }

  const openEditTrip = (e: React.MouseEvent, trip: BookedTrip) => {
    e.stopPropagation()
    setTripClient(trip.partner.name)
    setTripRoute(trip.route)
    setEditTrip(trip)
  }

  const saveTrip = () => {
    if (!editTrip) return
    updateTrip.mutate({ id: editTrip.id, data: { route: tripRoute } })
    setEditTrip(null)
  }

  if (deliveredTrips.length === 0 && trips.length === 0) {
    return <EmptyState icon={CheckCircle2} text="Tất cả phiếu đã ghép" />
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-0 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Left: Chuyến đã đi */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ borderRight: '1px solid var(--theme-border-default)' }}
        >
          <div
            className="px-3 py-2 shrink-0"
            style={{ borderBottom: '1px solid var(--theme-border-light)', background: 'var(--theme-bg-tertiary)' }}
          >
            <p className="typo-label">
              Chuyến đã đi ({deliveredTrips.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {deliveredTrips.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--theme-text-muted)' }}>Không có chuyến</p>
            ) : (
              deliveredTrips.map(wo => (
                <ChuyenCard
                  key={wo.id}
                  wo={wo}
                  isSelected={selectedWoId === wo.id}
                  onClick={() => setSelectedWoId(prev => prev === wo.id ? null : wo.id)}
                  onEdit={e => openEditWO(e, wo)}
                />
              ))
            )}
            {deliveredTrips.length > 0 && !selectedWoId && (
              <p className="text-[11px] text-center pt-1 pb-2" style={{ color: 'var(--theme-text-muted)' }}>
                ☝️ Nhấn vào chuyến để tìm gợi ý
              </p>
            )}
          </div>
        </div>

        {/* Right: Đơn hàng */}
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

      {/* Edit dialogs */}
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
