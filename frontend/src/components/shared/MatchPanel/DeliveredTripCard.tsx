import { useState } from 'react'
import { Pencil, Plus, CheckCircle2, Truck } from 'lucide-react'
import { ContBadge } from '@/components/shared/ContBadge'
import { ContainerRow } from './ContainerRow'
import { InlineField } from './InlineField'

export function DeliveredTripCard({
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
