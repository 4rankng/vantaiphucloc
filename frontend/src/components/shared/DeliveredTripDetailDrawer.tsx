import { useState, useEffect } from 'react'
import {
  User,
} from 'lucide-react'
import { Drawer } from '@/components/shared/Drawer'
import { Pill, type PillVariant } from '@/components/shared/Pill'
import { Button } from '@/components/ui'
import { InlineEditable } from '@/components/shared/InlineEditable/InlineEditable'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover/Popover'
import {
  useUpdateDeliveredTrip,
  useUpdateBookedTrip,
  useClients,
  useLocations,
  useBookedTrip,
} from '@/hooks/use-queries'
import type { DeliveredTrip, BookedTrip, ContType } from '@/data/domain'
import { CONT_TYPES } from '@/data/domain'

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

  // Load linked booked trip for MATCHED status
  const { data: fetchedBookedTrip } = useBookedTrip(
    trip.matched ? trip.bookedTripId ?? null : null,
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
                  value={trip.contType ?? null}
                  displayValue={trip.contType}
                  options={CONT_TYPES.map((t) => ({ value: t, label: t }))}
                  onChange={(v) => updateTrip.mutate({ id: trip.id, data: { contType: v as ContType } })}
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
                    <span style={{ color: trip.vehiclePlate ? 'var(--ink)' : 'var(--ink-4)' }}>
                      {trip.vehiclePlate ?? 'bất kỳ'}
                    </span>
                  }
                  value={trip.vehiclePlate ?? ''}
                  placeholder="Biển số xe"
                  onSave={(v) => updateTrip.mutateAsync({ id: trip.id, data: { vehiclePlate: v || null } })}
                />
              </CriteriaEditRow>

              {/* Khách hàng */}
              <div className="col-span-2">
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
          </div>

          {/* Trip details */}
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

          {/* Matched Booked Trip — MATCHED only */}
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
                  {/* Container */}
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
                      value={bookedTrip.contType ?? null}
                      displayValue={bookedTrip.contType}
                      options={CONT_TYPES.map((t) => ({ value: t, label: t }))}
                      onChange={(v) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { contType: v as ContType } })}
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

                  {/* Khách hàng */}
                  <div className="col-span-2">
                    <CriteriaEditRow label="Khách hàng">
                      <InlineSelect
                        value={bookedTrip.client?.id ?? null}
                        displayValue={bookedTrip.client?.name}
                        options={clients.map((c) => ({ value: c.id, label: c.name }))}
                        onChange={(id) => updateBookedTrip.mutate({ id: bookedTrip.id, data: { clientId: id as number } })}
                      />
                    </CriteriaEditRow>
                  </div>

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

        </div>
      </Drawer>
    </>
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
