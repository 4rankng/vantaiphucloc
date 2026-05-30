import { useState } from 'react'
import { Drawer } from '@/components/shared/Drawer'
import { Pill, type PillVariant } from '@/components/shared/Pill'
import { Button } from '@/components/ui'
import { InlineEditable } from '@/components/shared/InlineEditable/InlineEditable'
import {
  useUpdateDeliveredTrip,
  useClients,
  useLocations,
} from '@/hooks/use-queries'
import type { DeliveredTrip, ContType } from '@/data/domain'
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
  const { data: clients = [] } = useClients()
  const { data: locations = [] } = useLocations()

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
          <p className="text-[11.5px]" style={{ color: 'var(--ink-4)' }}>
            Nhấp vào giá trị để chỉnh sửa · Enter để lưu · Esc để huỷ
          </p>
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
                  onSave={async (v) => {
                    const normalized = v.trim().toUpperCase().replace(/-/g, '')
                    await updateTrip.mutateAsync({ id: trip.id, data: { contNumber: normalized || null } })
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
                      {trip.vehiclePlate || 'bất kỳ'}
                    </span>
                  }
                  value={trip.vehiclePlate ?? ''}
                  placeholder="Biển số xe"
                  onSave={async (v) => { await updateTrip.mutateAsync({ id: trip.id, data: { vehiclePlate: v || null } }) }}
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
                  onSave={async (v) => { await updateTrip.mutateAsync({ id: trip.id, data: { vessel: v || null } }) }}
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

              <CriteriaEditRow label="Cước" className="col-span-1 border-t border-r border-[var(--line)]">
                <InlineEditable
                  display={
                    <span className="tabular-nums" style={{ color: trip.revenue ? 'var(--ink)' : 'var(--ink-4)', fontFamily: 'var(--theme-font-mono)' }}>
                      {trip.revenue ? trip.revenue.toLocaleString('vi-VN') : '—'}
                    </span>
                  }
                  value={trip.revenue ? String(trip.revenue) : ''}
                  inputType="number"
                  placeholder="Nhập cước"
                  onSave={async (v) => { await updateTrip.mutateAsync({ id: trip.id, data: { revenue: v ? Number(v) : 0 } }) }}
                />
              </CriteriaEditRow>

              <CriteriaEditRow label="Lương SL" className="col-span-1 border-t border-[var(--line)]">
                <InlineEditable
                  display={
                    <span className="tabular-nums" style={{ color: trip.driverSalary ? 'var(--ink)' : 'var(--ink-4)', fontFamily: 'var(--theme-font-mono)' }}>
                      {trip.driverSalary ? trip.driverSalary.toLocaleString('vi-VN') : '—'}
                    </span>
                  }
                  value={trip.driverSalary ? String(trip.driverSalary) : ''}
                  inputType="number"
                  placeholder="Nhập lương SL"
                  onSave={async (v) => { await updateTrip.mutateAsync({ id: trip.id, data: { driverSalary: v ? Number(v) : 0 } }) }}
                />
              </CriteriaEditRow>
            </div>
          </div>

          {!trip.bookedTripId && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAISuggest(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-violet-600 text-xs font-medium border border-violet-200 bg-violet-50 hover:bg-violet-100 hover:border-violet-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:ring-offset-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
                  <path d="M20 3v4"/><path d="M22 5h-4"/>
                  <path d="M4 17v2"/><path d="M5 18H3"/>
                </svg>
                AI Đề xuất
              </button>
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
