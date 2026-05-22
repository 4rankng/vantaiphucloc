import { useState, useEffect } from 'react'
import { apiClient } from '@/services/api'
import {
  Camera,
  MapPin,
  Clock,
  User,
  ClipboardList,
  Loader2,
} from 'lucide-react'
import { PhotoLightbox } from '@/components/shared/PhotoLightbox'
import { Drawer } from '@/components/shared/Drawer'
import { Pill, type PillVariant } from '@/components/shared/Pill'
import { Button } from '@/components/ui'
import { EmptyState } from '@/components/shared/EmptyState'
import { InlineEditable } from '@/components/shared/InlineEditable/InlineEditable'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover/Popover'
import {
  useSuggestMatches,
  useReconcile,
  useUpdateDeliveredTrip,
  useUpdateBookedTrip,
  useUpdateContainerNumber,
  useClients,
  useLocations,
  useBookedTrip,
} from '@/hooks/use-queries'
import type { DeliveredTrip, DeliveredTripStatus, BookedTrip, ContType, OperationType } from '@/data/domain'
import { CONT_TYPES, OPERATION_TYPE_OPTIONS, OPERATION_TYPE_LABELS } from '@/data/domain'

const STATUS_PILL_VARIANT: Record<DeliveredTripStatus, PillVariant> = {
  PENDING: 'warn',
  MATCHED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'danger',
}
const STATUS_LABEL: Record<DeliveredTripStatus, string> = {
  PENDING: 'Chờ ghép',
  MATCHED: 'Đã ghép',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Hủy',
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [, m, d] = dateStr.split('-')
  if (!d) return dateStr
  return `${d}/${m}`
}

function scoreColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0
  if (pct >= 0.8) return 'var(--success)'
  if (pct >= 0.5) return 'var(--warning)'
  return 'var(--danger)'
}

export function DeliveredTripDetailDrawer({
  trip: initialTrip,
  onClose,
}: {
  trip: DeliveredTrip
  onClose: () => void
}) {
  const [trip, setTrip] = useState<DeliveredTrip>(initialTrip)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const { data: suggestionsData, isLoading: suggestionsLoading } = useSuggestMatches(
    trip.status === 'PENDING' ? trip.id : 0,
  )
  const reconcile = useReconcile()
  const _updateTrip = useUpdateDeliveredTrip()
  const _updateBookedTrip = useUpdateBookedTrip()
  const _updateContainer = useUpdateContainerNumber()
  const { data: clients = [] } = useClients()
  const { data: locations = [] } = useLocations()
  const [matchingId, setMatchingId] = useState<number | null>(null)

  // Load linked booked trip for MATCHED status
  const { data: fetchedBookedTrip } = useBookedTrip(
    trip.status === 'MATCHED' ? trip.bookedTripId ?? null : null,
  )
  const [bookedTrip, setBookedTrip] = useState<BookedTrip | null>(null)

  useEffect(() => {
    if (fetchedBookedTrip && !bookedTrip) setBookedTrip(fetchedBookedTrip)
  }, [fetchedBookedTrip])

  // Wrap mutations to also update local trip state on success
  const updateTrip = {
    ...(_updateTrip),
    mutate: (args: Parameters<typeof _updateTrip.mutate>[0]) =>
      _updateTrip.mutate(args, {
        onSuccess: (updated) => setTrip(updated),
      }),
    mutateAsync: async (args: Parameters<typeof _updateTrip.mutateAsync>[0]) => {
      const updated = await _updateTrip.mutateAsync(args)
      setTrip(updated)
      return updated
    },
  }
  const updateBookedTrip = {
    ...(_updateBookedTrip),
    mutate: (args: Parameters<typeof _updateBookedTrip.mutate>[0]) =>
      _updateBookedTrip.mutate(args, {
        onSuccess: (updated) => setBookedTrip(updated),
      }),
    mutateAsync: async (args: Parameters<typeof _updateBookedTrip.mutateAsync>[0]) => {
      const updated = await _updateBookedTrip.mutateAsync(args)
      setBookedTrip(updated)
      return updated
    },
  }
  const updateContainer = {
    ...(_updateContainer),
    mutateAsync: async (args: Parameters<typeof _updateContainer.mutateAsync>[0]) => {
      const updatedContainer = await _updateContainer.mutateAsync(args)
      setTrip((t) => ({
        ...t,
        containers: t.containers?.map((c) =>
          c.id === updatedContainer.id ? { ...c, containerNumber: updatedContainer.containerNumber } : c,
        ),
      }))
      return updatedContainer
    },
  }

  const suggestions = suggestionsData?.suggestions ?? []
  const hasPhotos = trip.containers?.some((c) => c.photoUrl)

  function handleMatch(bookedTripId: number) {
    setMatchingId(bookedTripId)
    reconcile.mutate(
      { deliveredTripId: trip.id, bookedTripId },
      { onSuccess: () => onClose() },
    )
  }

  function formatTimestamp(ts: string | null | undefined): string {
    if (!ts) return '—'
    const d = new Date(ts)
    return (
      d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    )
  }

  return (
    <>
      <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      <Drawer
        open
        onOpenChange={(o) => {
          if (!o) onClose()
        }}
        breadcrumb="Đối soát"
        title={
          <span className="flex items-center gap-2">
            <Pill variant={STATUS_PILL_VARIANT[trip.status]}>
              {STATUS_LABEL[trip.status]}
            </Pill>
            Chuyến đã đi
          </span>
        }
        meta={`${trip.client?.name ?? ''} · ${trip.containers?.[0]?.containerNumber ?? `#${trip.id}`}`}
        footer={
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        }
      >
        <div className="space-y-5">
          {/* Trip criteria summary */}
          <div
            className="px-3.5 py-3"
            style={{
              background: 'var(--surface-2)',
              borderRadius: 'var(--r-sm)',
              border: '1px solid var(--line)',
            }}
          >
            <div
              className="grid"
              style={{ gridTemplateColumns: '0.85fr 1.15fr', gap: '5px 16px' }}
            >
              {/* Container */}
              <CriteriaEditRow label="Container">
                <InlineEditable
                  display={
                    <span style={{ color: trip.containers?.[0]?.containerNumber ? 'var(--ink)' : 'var(--ink-4)' }}>
                      {trip.containers?.[0]?.containerNumber ?? 'bất kỳ'}
                    </span>
                  }
                  value={trip.containers?.[0]?.containerNumber ?? ''}
                  placeholder="Số container"
                  validate={async (v) => {
                    const raw = v.trim().toUpperCase().replace(/-/g, '')
                    if (!raw) return null
                    const res = await apiClient.validateContainer(raw)
                    if (!res.success || !res.data?.valid) {
                      return res.data?.error ?? 'Số container không hợp lệ'
                    }
                    return null
                  }}
                  onSave={(v) => {
                    const c = trip.containers?.[0]
                    if (!c) return
                    const normalized = v.trim().toUpperCase().replace(/-/g, '')
                    return updateContainer.mutateAsync({ tripId: trip.id, containerId: c.id, containerNumber: normalized })
                  }}
                />
              </CriteriaEditRow>

              {/* Điểm đi */}
              <CriteriaEditRow label="Điểm đi">
                <InlineSelect
                  value={trip.pickupLocation?.id ?? null}
                  displayValue={trip.pickupLocation?.name}
                  options={locations.map((l) => ({ value: l.id, label: l.name }))}
                  onChange={(id) => updateTrip.mutate({ id: trip.id, data: { pickupLocationId: id } })}
                />
              </CriteriaEditRow>

              {/* Loại cont */}
              <CriteriaEditRow label="Loại cont">
                <InlineSelect
                  value={trip.containers?.[0]?.contType ?? null}
                  displayValue={trip.containers?.[0]?.contType}
                  options={CONT_TYPES.map((t) => ({ value: t, label: t }))}
                  onChange={(v) => {
                    const containers = trip.containers?.map((c, i) =>
                      i === 0 ? { ...c, contType: v as ContType } : c,
                    )
                    if (containers) updateTrip.mutate({ id: trip.id, data: { containers } })
                  }}
                />
              </CriteriaEditRow>

              {/* Điểm đến */}
              <CriteriaEditRow label="Điểm đến">
                <InlineSelect
                  value={trip.dropoffLocation?.id ?? null}
                  displayValue={trip.dropoffLocation?.name}
                  options={locations.map((l) => ({ value: l.id, label: l.name }))}
                  onChange={(id) => updateTrip.mutate({ id: trip.id, data: { dropoffLocationId: id } })}
                />
              </CriteriaEditRow>

              {/* Số tàu */}
              <CriteriaEditRow label="Số tàu">
                <InlineEditable
                  display={
                    <span style={{ color: trip.vessel ? 'var(--ink)' : 'var(--ink-4)' }}>
                      {trip.vessel ?? 'bất kỳ'}
                    </span>
                  }
                  value={trip.vessel ?? ''}
                  placeholder="Số tàu"
                  onSave={(v) => updateTrip.mutateAsync({ id: trip.id, data: { vessel: v || null } })}
                />
              </CriteriaEditRow>

              {/* Số xe */}
              <CriteriaEditRow label="Số xe">
                <InlineEditable
                  display={
                    <span style={{ color: trip.vehicle?.plate ? 'var(--ink)' : 'var(--ink-4)' }}>
                      {trip.vehicle?.plate ?? 'bất kỳ'}
                    </span>
                  }
                  value={trip.vehicle?.plate ?? ''}
                  placeholder="Biển số xe"
                  onSave={(v) => updateTrip.mutateAsync({ id: trip.id, data: { vehicleExternalPlate: v || null } })}
                />
              </CriteriaEditRow>

              {/* Tác nghiệp */}
              <CriteriaEditRow label="Tác nghiệp">
                <InlineSelect
                  value={trip.operationType ?? null}
                  displayValue={
                    trip.operationType
                      ? OPERATION_TYPE_LABELS[trip.operationType]
                      : undefined
                  }
                  options={OPERATION_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  onChange={(v) => updateTrip.mutate({ id: trip.id, data: { operationType: v as OperationType } })}
                />
              </CriteriaEditRow>

              {/* Khách hàng */}
              <CriteriaEditRow label="Khách hàng">
                <InlineSelect
                  value={trip.client?.id ?? null}
                  displayValue={trip.client?.name}
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                  onChange={(id) => updateTrip.mutate({ id: trip.id, data: { clientId: id } })}
                />
              </CriteriaEditRow>
            </div>
          </div>

          {/* Container photos */}
          {hasPhotos && (
            <div className="space-y-2">
              <p
                className="text-[12px] m-0 font-medium"
                style={{ color: 'var(--ink-3)' }}
              >
                Ảnh container
              </p>
              <div
                className={`grid ${trip.containers.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}
              >
                {trip.containers.map((c) => (
                  <div key={c.id}>
                    <div
                      className="relative rounded-lg overflow-hidden aspect-square"
                      style={{ border: '1px solid var(--line)' }}
                    >
                      {c.photoUrl ? (
                        <button
                          className="block w-full h-full touch-manipulation"
                          onClick={() => setLightboxUrl(c.photoUrl!)}
                          aria-label={`Xem ảnh ${c.containerNumber}`}
                        >
                          <img
                            src={c.photoUrl}
                            alt={c.containerNumber}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center"
                          style={{ background: 'var(--surface-2)' }}
                        >
                          <Camera className="w-6 h-6" style={{ color: 'var(--ink-3)' }} />
                        </div>
                      )}
                      <div
                        className="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-center justify-between"
                        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                      >
                        <p
                          className="text-[11px] font-mono font-semibold truncate"
                          style={{ color: '#fff' }}
                        >
                          {c.containerNumber}
                        </p>
                        {c.contType && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ml-1"
                            style={{ background: 'var(--accent)', color: '#fff' }}
                          >
                            {c.contType}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Photo meta */}
                    {c.photoTimestamp && (
                      <p
                        className="text-[11px] m-0 mt-1 flex items-center gap-1"
                        style={{ color: 'var(--ink-3)' }}
                      >
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(c.photoTimestamp)}
                      </p>
                    )}
                    {c.photoAddress && (
                      <p
                        className="text-[11px] m-0 mt-0.5 flex items-center gap-1"
                        style={{ color: 'var(--ink-3)' }}
                      >
                        <MapPin className="w-3 h-3" />
                        {c.photoAddress}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trip details */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
          >
            {trip.gpsAddress && (
              <InfoRowCompact icon={MapPin} label="Vị trí GPS" value={trip.gpsAddress} />
            )}
            {(trip.driver || trip.vehicle) && (
              <div
                className="flex items-start gap-3 px-3.5 py-2 text-[13px]"
                style={{ borderBottom: 'none' }}
              >
                <User className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--ink-3)' }} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                  {trip.driver && (
                    <span style={{ color: 'var(--ink)' }}>
                      {trip.driver.name}{trip.driver.phone ? ` · ${trip.driver.phone}` : ''}
                    </span>
                  )}
                  {trip.vehicle && (
                    <span className="font-mono" style={{ color: 'var(--ink)' }}>
                      {trip.vehicle.plate}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Matched Booked Trip — MATCHED only */}
          {trip.status === 'MATCHED' && bookedTrip && (
            <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
              <p
                className="text-[12px] m-0 font-medium"
                style={{ color: 'var(--ink-3)' }}
              >
                Chuyến đặt trước (TO #{bookedTrip.id})
              </p>
              <div
                className="px-3.5 py-3"
                style={{
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--line)',
                }}
              >
                <div
                  className="grid"
                  style={{ gridTemplateColumns: '0.85fr 1.15fr', gap: '5px 16px' }}
                >
                  {/* Container */}
                  <CriteriaEditRow label="Container">
                    <InlineEditable
                      display={
                        <span style={{ color: bookedTrip.containers?.[0]?.containerNumber ? 'var(--ink)' : 'var(--ink-4)' }}>
                          {bookedTrip.containers?.[0]?.containerNumber ?? 'bất kỳ'}
                        </span>
                      }
                      value={bookedTrip.containers?.[0]?.containerNumber ?? ''}
                      placeholder="Số container"
                      validate={async (v) => {
                        const raw = v.trim().toUpperCase().replace(/-/g, '')
                        if (!raw) return null
                        const res = await apiClient.validateContainer(raw)
                        if (!res.success || !res.data?.valid) {
                          return res.data?.error ?? 'Số container không hợp lệ'
                        }
                        return null
                      }}
                      onSave={(v) => {
                        const normalized = v.trim().toUpperCase().replace(/-/g, '')
                        const containers = bookedTrip.containers?.map((c, i) =>
                          i === 0 ? { ...c, containerNumber: normalized } : c,
                        ) ?? [{ id: 0, containerNumber: normalized, contType: 'F20' as ContType }]
                        return updateBookedTrip.mutateAsync({ id: bookedTrip.id, data: { containers } })
                      }}
                    />
                  </CriteriaEditRow>

                  {/* Điểm đi */}
                  <CriteriaEditRow label="Điểm đi">
                    <InlineSelect
                      value={bookedTrip.pickupLocation?.id ?? null}
                      displayValue={bookedTrip.pickupLocation?.name}
                      options={locations.map((l) => ({ value: l.id, label: l.name }))}
                      onChange={(id) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { pickupLocationId: id as number } })}
                    />
                  </CriteriaEditRow>

                  {/* Loại cont */}
                  <CriteriaEditRow label="Loại cont">
                    <InlineSelect
                      value={bookedTrip.containers?.[0]?.contType ?? null}
                      displayValue={bookedTrip.containers?.[0]?.contType}
                      options={CONT_TYPES.map((t) => ({ value: t, label: t }))}
                      onChange={(v) => {
                        const containers = bookedTrip.containers?.map((c, i) =>
                          i === 0 ? { ...c, contType: v as ContType } : c,
                        )
                        if (containers) updateBookedTrip.mutate({ id: bookedTrip.id, data: { containers } })
                      }}
                    />
                  </CriteriaEditRow>

                  {/* Điểm đến */}
                  <CriteriaEditRow label="Điểm đến">
                    <InlineSelect
                      value={bookedTrip.dropoffLocation?.id ?? null}
                      displayValue={bookedTrip.dropoffLocation?.name}
                      options={locations.map((l) => ({ value: l.id, label: l.name }))}
                      onChange={(id) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { dropoffLocationId: id as number } })}
                    />
                  </CriteriaEditRow>

                  {/* Số tàu */}
                  <CriteriaEditRow label="Số tàu">
                    <InlineEditable
                      display={
                        <span style={{ color: bookedTrip.vessel ? 'var(--ink)' : 'var(--ink-4)' }}>
                          {bookedTrip.vessel ?? 'bất kỳ'}
                        </span>
                      }
                      value={bookedTrip.vessel ?? ''}
                      placeholder="Số tàu"
                      onSave={(v) => updateBookedTrip.mutateAsync({ id: bookedTrip.id, data: { vessel: v || null } })}
                    />
                  </CriteriaEditRow>

                  {/* Tác nghiệp */}
                  <CriteriaEditRow label="Tác nghiệp">
                    <InlineSelect
                      value={bookedTrip.operationType ?? null}
                      displayValue={
                        bookedTrip.operationType
                          ? OPERATION_TYPE_LABELS[bookedTrip.operationType]
                          : undefined
                      }
                      options={OPERATION_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                      onChange={(v) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { operationType: v as OperationType } })}
                    />
                  </CriteriaEditRow>

                  {/* Khách hàng */}
                  <CriteriaEditRow label="Khách hàng">
                    <InlineSelect
                      value={bookedTrip.client?.id ?? null}
                      displayValue={bookedTrip.client?.name}
                      options={clients.map((c) => ({ value: c.id, label: c.name }))}
                      onChange={(id) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { clientId: id as number } })}
                    />
                  </CriteriaEditRow>

                  {/* Doanh thu */}
                  <CriteriaEditRow label="Doanh thu">
                    <InlineEditable
                      display={
                        <span style={{ color: bookedTrip.revenue ? 'var(--ink)' : 'var(--ink-4)' }}>
                          {bookedTrip.revenue ? bookedTrip.revenue.toLocaleString('vi-VN') + ' đ' : '—'}
                        </span>
                      }
                      value={String(bookedTrip.revenue ?? '')}
                      placeholder="Doanh thu"
                      onSave={(v) => updateBookedTrip.mutateAsync({ id: bookedTrip.id, data: { revenue: Number(v) || 0 } })}
                    />
                  </CriteriaEditRow>
                </div>
              </div>
            </div>
          )}

          {/* Match suggestions — PENDING only */}
          {trip.status === 'PENDING' && (
            <div className="space-y-3 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
              <p
                className="text-[12px] m-0 font-medium"
                style={{ color: 'var(--ink-3)' }}
              >
                Ghép chuyến
              </p>

              {suggestionsLoading && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent)' }} />
                  <p className="text-[13px] m-0" style={{ color: 'var(--ink-2)' }}>
                    Đang tìm chuyến phù hợp...
                  </p>
                </div>
              )}

              {!suggestionsLoading && suggestions.length === 0 && (
                <div className="flex flex-col items-center py-4">
                  <EmptyState
                    icon={<ClipboardList className="h-5 w-5" />}
                    title="Không tìm thấy chuyến phù hợp"
                    compact
                  />
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[12px] m-0" style={{ color: 'var(--ink-3)' }}>
                    {suggestions.length} chuyến đặt trước phù hợp
                  </p>
                  {suggestions.map((s) => (
                    <SuggestionCard
                      key={`${s.bookedTrip.id}-${s.containerId}`}
                      suggestion={s}
                      isMatching={matchingId === s.bookedTrip.id && reconcile.isPending}
                      onMatch={() => handleMatch(s.bookedTrip.id)}
                      updateBookedTrip={updateBookedTrip}
                      clients={clients}
                      locations={locations}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Drawer>
    </>
  )
}

// ─── Suggestion card with editable booked trip fields ────────────────────────

type UpdateBookedTripFn = {
  mutate: (args: { id: number; data: import('@/services/api/bookedTrips.api').BookedTripUpdatePayload }) => void
  mutateAsync: (args: { id: number; data: import('@/services/api/bookedTrips.api').BookedTripUpdatePayload }) => Promise<BookedTrip>
}

function SuggestionCard({
  suggestion: s,
  isMatching,
  onMatch,
  updateBookedTrip: _update,
  clients,
  locations,
}: {
  suggestion: import('@/data/domain').MatchSuggestion
  isMatching: boolean
  onMatch: () => void
  updateBookedTrip: UpdateBookedTripFn
  clients: import('@/data/domain').Client[]
  locations: import('@/data/domain').Location[]
}) {
  const [bt, setBt] = useState(s.bookedTrip)
  // Keep bt in sync when suggestions re-fetch (e.g. after saving a field)
  useEffect(() => {
    setBt(s.bookedTrip)
  }, [s.bookedTrip.id, s.bookedTrip.updatedAt])
  const pct = s.maxScore > 0 ? Math.round((s.matchScore / s.maxScore) * 100) : 0

  const save = async (data: import('@/services/api/bookedTrips.api').BookedTripUpdatePayload) => {
    const updated = await _update.mutateAsync({ id: bt.id, data })
    setBt(updated)
  }

  // Derive current display value for each criterion from local bt state
  const localValue = (name: string): string | null | undefined => {
    switch (name) {
      case 'container_number': return bt.containers?.[0]?.containerNumber
      case 'pickup_location':  return bt.pickupLocation?.name
      case 'dropoff_location': return bt.dropoffLocation?.name
      case 'work_type':        return bt.containers?.[0]?.contType
      case 'vessel':           return bt.vessel
      case 'vehicle_plate':    return bt.vehiclePlate
      case 'operation_type':   return bt.operationType
        ? (OPERATION_TYPE_LABELS[bt.operationType as OperationType] ?? bt.operationType)
        : null
      case 'client':           return bt.client?.name
      default:                 return null
    }
  }

  return (
    <div
      className="flex flex-col gap-2 px-3.5 py-3"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-sm)',
      }}
    >
      <div className="min-w-0">
        <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', gap: '6px 12px' }}>
          {s.criteria.map((c) => {
            const matchColor = c.match
              ? c.fuzzy ? 'var(--warning)' : 'var(--success)'
              : 'var(--ink-4)'
            const current = localValue(c.name)

            const editControl = () => {
              switch (c.name) {
                case 'vessel':
                  return (
                    <InlineEditable
                      display={<span style={{ color: current ? matchColor : 'var(--ink-4)' }}>{current ?? '—'}</span>}
                      value={bt.vessel ?? ''}
                      placeholder="Số tàu"
                      onSave={(v) => save({ vessel: v || null })}
                    />
                  )
                case 'pickup_location':
                  return (
                    <InlineSelect
                      value={bt.pickupLocation?.id ?? null}
                      displayValue={current}
                      options={locations.map((l) => ({ value: l.id, label: l.name }))}
                      onChange={(id) => save({ pickupLocationId: id as number })}
                    />
                  )
                case 'dropoff_location':
                  return (
                    <InlineSelect
                      value={bt.dropoffLocation?.id ?? null}
                      displayValue={current}
                      options={locations.map((l) => ({ value: l.id, label: l.name }))}
                      onChange={(id) => save({ dropoffLocationId: id as number })}
                    />
                  )
                case 'work_type':
                  return (
                    <InlineSelect
                      value={bt.containers?.[0]?.contType ?? null}
                      displayValue={current}
                      options={CONT_TYPES.map((t) => ({ value: t, label: t }))}
                      onChange={(v) => {
                        const containers = bt.containers?.map((c, i) =>
                          i === 0 ? { ...c, contType: v as ContType } : c,
                        )
                        if (containers) save({ containers })
                      }}
                    />
                  )
                case 'operation_type':
                  return (
                    <InlineSelect
                      value={bt.operationType ?? null}
                      displayValue={current}
                      options={OPERATION_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                      onChange={(v) => save({ operationType: v as OperationType })}
                    />
                  )
                case 'client':
                  return (
                    <InlineSelect
                      value={bt.client?.id ?? null}
                      displayValue={current}
                      options={clients.map((c) => ({ value: c.id, label: c.name }))}
                      onChange={(id) => save({ clientId: id as number })}
                    />
                  )
                case 'vehicle_plate':
                  return (
                    <InlineEditable
                      display={<span style={{ color: current ? matchColor : 'var(--ink-4)' }}>{current ?? '—'}</span>}
                      value={bt.vehiclePlate ?? ''}
                      placeholder="Biển số xe"
                      onSave={(v) => save({ vehiclePlate: v || null })}
                    />
                  )
                default:
                  // Read-only (container_number)
                  return (
                    <span className="font-mono font-semibold" style={{ color: current ? matchColor : 'var(--ink-4)' }}>
                      {current ?? '—'}
                    </span>
                  )
              }
            }

            return (
              <div key={c.name} className="flex items-baseline gap-1 min-w-0 text-[12px]">
                <span className="shrink-0 text-[10px] font-semibold leading-none" style={{ color: matchColor }}>
                  {c.match ? '✓' : '✕'}
                </span>
                <span className="shrink-0 whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{c.label}:</span>
                <div className="min-w-0 flex-1 overflow-hidden">{editControl()}</div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          variant={pct >= 80 ? 'default' : 'outline'}
          size="sm"
          onClick={onMatch}
          disabled={isMatching}
        >
          {isMatching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Ghép
        </Button>
      </div>
    </div>
  )
}

// ─── Criteria edit helpers ────────────────────────────────────────────────────

function CriteriaEditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 min-w-0 text-[12px]">
      <span className="shrink-0" style={{ color: 'var(--ink-3)' }}>
        {label}:
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function InlineSelect({
  value,
  displayValue,
  options,
  onChange,
}: {
  value: string | number | null
  displayValue?: string | null
  options: { value: string | number; label: string }[]
  onChange: (value: string | number) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const unique = options.filter(
    (o, i, arr) =>
      arr.findIndex(
        (x) => String(x.value) === String(o.value) || x.label === o.label,
      ) === i,
  )
  const showSearch = unique.length > 6

  const filtered = showSearch
    ? unique.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : unique

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch('') }}>
      <PopoverTrigger asChild>
        <button
          className="group inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 -mx-1.5 text-left text-[12px] transition-colors w-full flex-wrap"
          style={{ background: 'transparent', color: displayValue ? 'var(--ink)' : 'var(--ink-4)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <span className="truncate italic">{displayValue ?? 'bất kỳ'}</span>
          <svg className="shrink-0 opacity-40 ml-auto" width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="p-0 min-w-[180px] max-w-[260px]">
        {showSearch && (
          <div className="px-2 pt-2 pb-1" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full text-[12px] px-2 py-1 rounded-md outline-none"
              style={{
                background: 'var(--theme-bg-tertiary)',
                color: 'var(--theme-text-primary)',
                border: 'none',
              }}
            />
          </div>
        )}
        <div className="py-1 max-h-52 overflow-y-auto">
          <button
            className="w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors"
            style={{ color: 'var(--theme-text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            onClick={() => { onChange(''); setOpen(false) }}
          >
            <span className="w-3" />
            <span className="italic">— bất kỳ —</span>
          </button>
          {filtered.map((o) => {
            const selected = String(o.value) === String(value)
            return (
              <button
                key={o.value}
                className="w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors"
                style={{ color: selected ? 'var(--theme-brand-primary)' : 'var(--theme-text-primary)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                onClick={() => { onChange(o.value); setOpen(false); setSearch('') }}
              >
                {selected
                  ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <span className="w-3" />
                }
                <span className="truncate">{o.label}</span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-[12px] text-center" style={{ color: 'var(--theme-text-muted)' }}>
              Không tìm thấy
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRowCompact({
  icon: Icon,
  label,
  value,
  noBorder,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  noBorder?: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 px-3.5 py-2 text-[13px]"
      style={{ borderBottom: noBorder ? 'none' : '1px solid var(--line)' }}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
      <span className="shrink-0" style={{ color: 'var(--ink-3)', minWidth: 72 }}>
        {label}
      </span>
      <span className="min-w-0" style={{ color: 'var(--ink)' }}>
        {value}
      </span>
    </div>
  )
}
