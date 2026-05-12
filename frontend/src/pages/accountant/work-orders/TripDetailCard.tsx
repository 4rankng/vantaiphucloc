import { useState, useCallback } from 'react'
import { Calendar, MapPin, Pencil, Save, X } from 'lucide-react'
import { ContBadge } from '@/components/shared/ContBadge'
import { LocationSelect } from '@/components/shared/LocationSelect/LocationSelect'
import { fmtDate } from '@/lib/date-utils'
import { resolveRoute } from '@/lib/route-utils'
import { useUpdateWorkOrder, usePartners, useLocations } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { WORK_TYPES } from '@/data/domain'
import type { WorkOrder, ContainerItem, WorkType } from '@/data/domain'

interface TripDetailCardProps {
  workOrder: WorkOrder
  onEdited?: () => void
}

export function TripDetailCard({ workOrder, onEdited }: TripDetailCardProps) {
  const plate = workOrder.driver.vehicle?.plate

  if (!onEdited) {
    return <TripDetailCardView workOrder={workOrder} />
  }

  return <TripDetailCardEditable workOrder={workOrder} onEdited={onEdited} />
}

function TripDetailCardView({ workOrder }: { workOrder: WorkOrder }) {
  const plate = workOrder.driver.vehicle?.plate

  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col gap-2"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {plate ? (
          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded"
            style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
          >
            {plate}
          </span>
        ) : (
          <span className="text-xs font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
            {workOrder.driver.name || '—'}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          <Calendar className="w-3 h-3" />
          {workOrder.createdAt ? fmtDate(workOrder.createdAt) : '—'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--theme-text-muted)' }}>KH</span>
        <span className="text-xs font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
          {workOrder.partner.name}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
          <MapPin className="w-3 h-3" />
          {resolveRoute(workOrder) || '—'}
        </span>
        {workOrder.containers.slice(0, 4).map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            <ContBadge type={c.workType} />
            <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {c.containerNumber}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function TripDetailCardEditable({ workOrder, onEdited }: { workOrder: WorkOrder; onEdited: () => void }) {
  const plate = workOrder.driver.vehicle?.plate
  const toast = useToast()
  const updateWO = useUpdateWorkOrder()
  const { data: partners = [] } = usePartners()
  const { data: locations = [] } = useLocations()

  const [editing, setEditing] = useState(false)
  const [clientId, setClientId] = useState(String(workOrder.partner.id))
  const [pickupName, setPickupName] = useState(workOrder.pickupLocation?.name ?? '')
  const [dropoffName, setDropoffName] = useState(workOrder.dropoffLocation?.name ?? '')
  const [containers, setContainers] = useState<ContainerItem[]>(
    workOrder.containers.map(c => ({ ...c }))
  )

  const handleSave = useCallback(async () => {
    const pickupLoc = locations.find(l => l.name === pickupName)
    const dropoffLoc = locations.find(l => l.name === dropoffName)
    if (!pickupLoc || !dropoffLoc) {
      toast.error('Lỗi', 'Điểm lấy/trả không hợp lệ')
      return
    }
    try {
      await updateWO.mutateAsync({
        id: workOrder.id,
        data: {
          partnerId: Number(clientId),
          pickupLocationId: pickupLoc.id,
          dropoffLocationId: dropoffLoc.id,
          containers: containers.map(c => ({
            containerNumber: c.containerNumber,
            workType: c.workType,
            photoUrl: c.photoUrl ?? '',
            photoLat: c.photoLat ?? null,
            photoLng: c.photoLng ?? null,
            photoTimestamp: c.photoTimestamp ?? null,
          })),
        },
      })
      toast.success('Thành công', 'Đã cập nhật chuyến')
      setEditing(false)
      onEdited()
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật chuyến')
    }
  }, [workOrder.id, clientId, pickupName, dropoffName, containers, locations, updateWO, toast, onEdited])

  const updateContainer = useCallback((idx: number, field: keyof ContainerItem, value: string) => {
    setContainers(prev => prev.map((c, i) =>
      i === idx ? { ...c, [field]: value } : c
    ))
  }, [])

  const addContainer = useCallback(() => {
    setContainers(prev => [...prev, { containerNumber: '', workType: 'E20' as WorkType, photoUrl: '' }])
  }, [])

  const removeContainer = useCallback((idx: number) => {
    setContainers(prev => prev.filter((_, i) => i !== idx))
  }, [])

  if (editing) {
    return (
      <div
        className="rounded-xl px-4 py-3 space-y-3"
        style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-brand-primary)' }}
      >
        <div className="flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>Chỉnh sửa chuyến</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {plate ? (
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
              {plate}
            </span>
          ) : (
            <span className="text-xs font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
              {workOrder.driver.name || '—'}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Calendar className="w-3 h-3" />
            {workOrder.createdAt ? fmtDate(workOrder.createdAt) : '—'}
          </span>
        </div>

        <div>
          <label className="text-[11px] font-semibold block mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg text-xs border"
            style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
          >
            {partners.map(p => (
              <option key={p.id} value={String(p.id)}>{p.code ? `[${p.code}] ` : ''}{p.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold block mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>Điểm lấy</label>
            <LocationSelect value={pickupName} onChange={setPickupName} placeholder="Điểm lấy hàng" />
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>Điểm trả</label>
            <LocationSelect value={dropoffName} onChange={setDropoffName} placeholder="Điểm trả hàng" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Container</label>
            <button onClick={addContainer} className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: 'var(--theme-brand-primary)', background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)' }}>
              + Thêm
            </button>
          </div>
          <div className="space-y-1">
            {containers.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={c.containerNumber}
                  onChange={e => updateContainer(i, 'containerNumber', e.target.value.toUpperCase())}
                  placeholder="Số cont"
                  className="flex-1 px-2 py-1 rounded text-xs border font-mono"
                  style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
                />
                <select
                  value={c.workType}
                  onChange={e => updateContainer(i, 'workType', e.target.value as WorkType)}
                  className="px-1.5 py-1 rounded text-xs border"
                  style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
                >
                  {WORK_TYPES.map(wt => <option key={wt} value={wt}>{wt}</option>)}
                </select>
                {containers.length > 1 && (
                  <button onClick={() => removeContainer(i)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--theme-status-error)' }}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={updateWO.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity disabled:opacity-40"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            {updateWO.isPending ? <span className="w-3 h-3 animate-spin border-2 border-current border-t-transparent rounded-full" /> : <Save className="w-3 h-3" />}
            Lưu
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
          >
            Huỷ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col gap-2 relative group"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <button
        onClick={() => setEditing(true)}
        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
        style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)', color: 'var(--theme-brand-primary)' }}
      >
        <Pencil className="w-3 h-3" />
        Chỉnh sửa
      </button>

      <div className="flex items-center gap-2 flex-wrap">
        {plate ? (
          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded"
            style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
          >
            {plate}
          </span>
        ) : (
          <span className="text-xs font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
            {workOrder.driver.name || '—'}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          <Calendar className="w-3 h-3" />
          {workOrder.createdAt ? fmtDate(workOrder.createdAt) : '—'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--theme-text-muted)' }}>KH</span>
        <span className="font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{workOrder.partner.name}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
          <MapPin className="w-3 h-3" />
          {resolveRoute(workOrder) || '—'}
        </span>
        {workOrder.containers.slice(0, 4).map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            <ContBadge type={c.workType} />
            <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {c.containerNumber}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
