import { useState, useEffect } from 'react'
import {
  User,
} from 'lucide-react'
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
  const _updateTrip = useUpdateDeliveredTrip()
  const _updateBookedTrip = useUpdateBookedTrip()
  const { data: clients = [] } = useClients()
  const { data: locations = [] } = useLocations()

  const { data: fetchedBookedTrip } = useBookedTrip(
    trip.matched ? trip.bookedTripId ?? null : null,
  )
  const [bookedTrip, setBookedTrip] = useState<BookedTrip | null>(null)

  useEffect(() => {
    if (fetchedBookedTrip && !bookedTrip) setBookedTrip(fetchedBookedTrip)
  }, [fetchedBookedTrip])

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
        breadcrumb="Đối soát"
        title={
          <span className="flex items-center gap-2">
            <Pill variant={statusPillVariant(trip.matched)}>
              {statusLabel(trip.matched)}
            </Pill>
            Chuyến đã đi
          </span>
        }
        meta={`${trip.client?.name ?? ''} · ${trip.contNumber ?? `#${trip.id}`}`}
        footer={
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        }
      >
        <div className="space-y-5">
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
              <CriteriaEditRow label="Container">
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

              <CriteriaEditRow label="Điểm đi">
                <InlineSelect
                  value={trip.pickupLocation?.id ?? null}
                  displayValue={trip.pickupLocation?.name}
                  options={locations.map((l) => ({ value: l.id, label: l.name }))}
                  onChange={(id) => updateTrip.mutate({ id: trip.id, data: { pickupLocationId: id } })}
                />
              </CriteriaEditRow>

              <CriteriaEditRow label="Loại cont">
                <InlineSelect
                  value={trip.contType ?? null}
                  displayValue={trip.contType}
                  options={CONT_TYPES.map((t) => ({ value: t, label: t }))}
                  onChange={(v) => updateTrip.mutate({ id: trip.id, data: { contType: v as ContType } })}
                />
              </CriteriaEditRow>

              <CriteriaEditRow label="Điểm đến">
                <InlineSelect
                  value={trip.dropoffLocation?.id ?? null}
                  displayValue={trip.dropoffLocation?.name}
                  options={locations.map((l) => ({ value: l.id, label: l.name }))}
                  onChange={(id) => updateTrip.mutate({ id: trip.id, data: { dropoffLocationId: id } })}
                />
              </CriteriaEditRow>

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

          <div
            className="rounded-lg overflow-hidden"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
          >
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

          {trip.matched && bookedTrip && (
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
                  <CriteriaEditRow label="Container">
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

                  <CriteriaEditRow label="Điểm đi">
                    <InlineSelect
                      value={bookedTrip.pickupLocation?.id ?? null}
                      displayValue={bookedTrip.pickupLocation?.name}
                      options={locations.map((l) => ({ value: l.id, label: l.name }))}
                      onChange={(id) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { pickupLocationId: id as number } })}
                    />
                  </CriteriaEditRow>

                  <CriteriaEditRow label="Loại cont">
                    <InlineSelect
                      value={bookedTrip.contType ?? null}
                      displayValue={bookedTrip.contType}
                      options={CONT_TYPES.map((t) => ({ value: t, label: t }))}
                      onChange={(v) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { contType: v as ContType } })}
                    />
                  </CriteriaEditRow>

                  <CriteriaEditRow label="Điểm đến">
                    <InlineSelect
                      value={bookedTrip.dropoffLocation?.id ?? null}
                      displayValue={bookedTrip.dropoffLocation?.name}
                      options={locations.map((l) => ({ value: l.id, label: l.name }))}
                      onChange={(id) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { dropoffLocationId: id as number } })}
                    />
                  </CriteriaEditRow>

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

                  <CriteriaEditRow label="Khách hàng">
                    <InlineSelect
                      value={bookedTrip.client?.id ?? null}
                      displayValue={bookedTrip.client?.name}
                      options={clients.map((c) => ({ value: c.id, label: c.name }))}
                      onChange={(id) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { clientId: id as number } })}
                    />
                  </CriteriaEditRow>

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

        </div>
      </Drawer>
    </>
  )
}
