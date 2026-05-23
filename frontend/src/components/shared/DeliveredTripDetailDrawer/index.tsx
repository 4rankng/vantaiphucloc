import { useState, useEffect } from 'react'
import { Drawer } from '@/components/shared/Drawer'
import { Pill, type PillVariant } from '@/components/shared/Pill'
import { Button } from '@/components/ui'
import { InlineEditable } from '@/components/shared/InlineEditable/InlineEditable'
import {
  useUpdateDeliveredTrip,
  useUpdateBookedTrip,
  useClients,
  useLocations,
  useBookedTrip,
} from '@/hooks/use-queries'
import type { DeliveredTrip, BookedTrip, ContType } from '@/data/domain'
import { CONT_TYPES } from '@/data/domain'
import { CriteriaEditRow } from './CriteriaEditRow'
import { InlineSelect } from './InlineSelect'
import { AISuggestionDialog } from '../AISuggestionDialog'

function statusPillVariant(matched: boolean): PillVariant {
  return matched ? 'success' : 'warn'
}
function statusLabel(matched: boolean): string {
  return matched ? 'Đã ghép' : 'Chờ ghép'
}

export function DeliveredTripDetailDrawer({
  trip: initialTrip,
  onClose,
}: {
  trip: DeliveredTrip
  onClose: () => void
}) {
  const [trip, setTrip] = useState<DeliveredTrip>(initialTrip)
  const [showAISuggest, setShowAISuggest] = useState(false)
  const _updateTrip = useUpdateDeliveredTrip()
  const _updateBookedTrip = useUpdateBookedTrip()
  const { data: clients = [] } = useClients()
  const { data: locations = [] } = useLocations()

  const { data: fetchedBookedTrip } = useBookedTrip(
    trip.bookedTripId,
  )
  const [bookedTrip, setBookedTrip] = useState<BookedTrip | null>(null)

  useEffect(() => {
    if (fetchedBookedTrip && !bookedTrip) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBookedTrip(fetchedBookedTrip)
    }
  }, [fetchedBookedTrip, bookedTrip])

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

  return (
    <>
      <Drawer
        open
        onOpenChange={(o) => {
          if (!o) onClose()
        }}
        breadcrumb={`Đối soát · ${trip.client?.name ?? ''}`}
        title={
          <>
            <span>Chuyến đã đi</span>
            <Pill variant={statusPillVariant(!!trip.bookedTripId)}>
              {statusLabel(!!trip.bookedTripId)}
            </Pill>
          </>
        }
        footer={
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        }
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-[var(--line)] overflow-hidden shadow-sm bg-[var(--surface)]">
            <div className="grid grid-cols-2">
              <CriteriaEditRow label="Container" className="col-span-1 border-b border-r border-[var(--line)]">
                <InlineEditable
                  display={
                    <span style={{ color: trip.contNumber ? 'var(--ink)' : 'var(--ink-4)' }}>
                      {trip.contNumber ?? 'bất kỳ'}
                    </span>
                  }
                  value={trip.contNumber ?? ''}
                  placeholder="Số container"
                  onSave={(v) => {
                    const normalized = v.trim().toUpperCase().replace(/-/g, '')
                    return updateTrip.mutateAsync({ id: trip.id, data: { contNumber: normalized || null } })
                  }}
                />
              </CriteriaEditRow>

              <CriteriaEditRow label="Loại cont" className="col-span-1 border-b border-[var(--line)]">
                <InlineSelect
                  value={trip.contType ?? null}
                  displayValue={trip.contType}
                  options={CONT_TYPES.map((t) => ({ value: t, label: t }))}
                  onChange={(v) => updateTrip.mutate({ id: trip.id, data: { contType: v as ContType } })}
                />
              </CriteriaEditRow>

              <CriteriaEditRow label="Số xe" className="col-span-1 border-b border-r border-[var(--line)]">
                <InlineEditable
                  display={
                    <span style={{ color: trip.vehiclePlate ? 'var(--ink)' : 'var(--ink-4)' }}>
                      {trip.vehiclePlate ?? 'bất kỳ'}
                    </span>
                  }
                  value={trip.vehiclePlate ?? ''}
                  placeholder="Biển số xe"
                  onSave={(v) => updateTrip.mutateAsync({ id: trip.id, data: { vehiclePlate: v || null } })}
                />
              </CriteriaEditRow>

              <CriteriaEditRow label="Số tàu" className="col-span-1 border-b border-[var(--line)]">
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

              <CriteriaEditRow label="Điểm đi" className="col-span-1 border-b border-r border-[var(--line)]">
                <InlineSelect
                  value={trip.pickupLocation?.id ?? null}
                  displayValue={trip.pickupLocation?.name}
                  options={locations.map((l) => ({ value: l.id, label: l.name }))}
                  onChange={(id) => updateTrip.mutate({ id: trip.id, data: { pickupLocationId: id } })}
                />
              </CriteriaEditRow>

              <CriteriaEditRow label="Điểm đến" className="col-span-1 border-b border-[var(--line)]">
                <InlineSelect
                  value={trip.dropoffLocation?.id ?? null}
                  displayValue={trip.dropoffLocation?.name}
                  options={locations.map((l) => ({ value: l.id, label: l.name }))}
                  onChange={(id) => updateTrip.mutate({ id: trip.id, data: { dropoffLocationId: id } })}
                />
              </CriteriaEditRow>

              <CriteriaEditRow label="Khách hàng" className="col-span-2">
                <InlineSelect
                  value={trip.client?.id ?? null}
                  displayValue={trip.client?.name}
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                  onChange={(id) => updateTrip.mutate({ id: trip.id, data: { clientId: id } })}
                />
              </CriteriaEditRow>
            </div>
          </div>

          {!trip.bookedTripId && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAISuggest(true)}
                className="ai-btn-glow relative group inline-flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-semibold tracking-wide transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1"
                style={{ background: 'linear-gradient(to right, #6366f1, #a855f7, #ec4899)' }}
              >
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
                    <path d="M20 3v4"/><path d="M22 5h-4"/>
                    <path d="M4 17v2"/><path d="M5 18H3"/>
                  </svg>
                </span>
                <span className="inline-flex items-center gap-2 group-hover:translate-x-2.5 transition-transform duration-300">
                  AI Đề xuất
                </span>
                <span className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
              </button>
            </div>
          )}

          {trip.bookedTripId && bookedTrip && (
            <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
              <p
                className="text-[12px] m-0 font-medium"
                style={{ color: 'var(--ink-3)' }}
              >
                Chuyến đặt trước (TO #{bookedTrip.id})
              </p>
              <div className="rounded-xl border border-[var(--line)] overflow-hidden shadow-sm bg-[var(--surface)]">
                <div className="grid grid-cols-2">
                  <CriteriaEditRow label="Container" className="col-span-1 border-b border-r border-[var(--line)]">
                    <InlineEditable
                      display={
                        <span style={{ color: bookedTrip.contNumber ? 'var(--ink)' : 'var(--ink-4)' }}>
                          {bookedTrip.contNumber ?? 'bất kỳ'}
                        </span>
                      }
                      value={bookedTrip.contNumber ?? ''}
                      placeholder="Số container"
                      onSave={(v) => {
                        const normalized = v.trim().toUpperCase().replace(/-/g, '')
                        return updateBookedTrip.mutateAsync({ id: bookedTrip.id, data: { contNumber: normalized || null } })
                      }}
                    />
                  </CriteriaEditRow>

                  <CriteriaEditRow label="Loại cont" className="col-span-1 border-b border-[var(--line)]">
                    <InlineSelect
                      value={bookedTrip.contType ?? null}
                      displayValue={bookedTrip.contType}
                      options={CONT_TYPES.map((t) => ({ value: t, label: t }))}
                      onChange={(v) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { contType: v as ContType } })}
                    />
                  </CriteriaEditRow>

                  <CriteriaEditRow label="Số tàu" className="col-span-1 border-b border-[var(--line)]">
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

                  <CriteriaEditRow label="Điểm đi" className="col-span-1 border-b border-r border-[var(--line)]">
                    <InlineSelect
                      value={bookedTrip.pickupLocation?.id ?? null}
                      displayValue={bookedTrip.pickupLocation?.name}
                      options={locations.map((l) => ({ value: l.id, label: l.name }))}
                      onChange={(id) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { pickupLocationId: id as number } })}
                    />
                  </CriteriaEditRow>

                  <CriteriaEditRow label="Điểm đến" className="col-span-1 border-b border-[var(--line)]">
                    <InlineSelect
                      value={bookedTrip.dropoffLocation?.id ?? null}
                      displayValue={bookedTrip.dropoffLocation?.name}
                      options={locations.map((l) => ({ value: l.id, label: l.name }))}
                      onChange={(id) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { dropoffLocationId: id as number } })}
                    />
                  </CriteriaEditRow>

                  <CriteriaEditRow label="Khách hàng" className="col-span-2">
                    <InlineSelect
                      value={bookedTrip.client?.id ?? null}
                      displayValue={bookedTrip.client?.name}
                      options={clients.map((c) => ({ value: c.id, label: c.name }))}
                      onChange={(id) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { clientId: id as number } })}
                    />
                  </CriteriaEditRow>
                </div>
              </div>
            </div>
          )}

        </div>
      </Drawer>

      {showAISuggest && (
        <AISuggestionDialog
          trip={trip}
          onClose={() => setShowAISuggest(false)}
        />
      )}
    </>
  )
}
