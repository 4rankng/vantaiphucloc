import { Truck, Plus, X, Trash2 } from 'lucide-react'
import { Plate } from '@/components/shared/data-display/Plate'

export interface VehicleGroupCardProps {
  plate: string
  drivers: { id: number; driverId: number; driverName: string }[]
  onAddDriver: () => void
  onRemoveDriver: (vdId: number, name: string) => void
  onDeleteVehicle: () => void
}

export function VehicleGroupCard({
  plate,
  drivers,
  onAddDriver,
  onRemoveDriver,
  onDeleteVehicle,
}: VehicleGroupCardProps) {
  return (
    <div
      className="py-3 px-1 flex flex-col gap-2.5"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      {/* Header row: plate + delete */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
          >
            <Truck className="h-4 w-4" />
          </div>
          <Plate>{plate}</Plate>
          {drivers.length > 0 && (
            <span
              className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-3)' }}
            >
              {drivers.length} lái
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDeleteVehicle}
          className="min-h-[44px] min-w-[44px] w-8 h-8 flex items-center justify-center rounded-lg border touch-target"
          style={{
            borderColor: 'var(--line)',
            color: 'var(--theme-status-error, var(--status-error, #e53e3e))',
          }}
          title="Xoá xe"
          aria-label="Xoá xe"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Driver chips */}
      <div className="flex flex-wrap items-center gap-1.5 pl-10">
        {drivers.length === 0 ? (
          <span className="text-[12px] italic" style={{ color: 'var(--ink-3)' }}>
            Chưa có lái xe
          </span>
        ) : (
          drivers.map((d) => (
            <span
              key={d.id}
              className="inline-flex items-center gap-1 rounded-md text-[12px] font-medium px-2 py-0.5"
              style={{
                background: 'var(--surface-3)',
                color: 'var(--ink-2)',
              }}
            >
              <span className="truncate max-w-[110px]">{d.driverName}</span>
              <button
                type="button"
                onClick={() => onRemoveDriver(d.id, d.driverName)}
                className="min-h-[44px] min-w-[44px] w-5 h-5 -mr-1.5 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
                style={{ color: 'var(--ink-3)' }}
                aria-label={`Gỡ ${d.driverName}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))
        )}
        <button
          type="button"
          onClick={onAddDriver}
          className="min-h-[44px] min-w-[44px] w-7 h-7 flex items-center justify-center rounded-md border border-dashed transition-colors touch-target"
          style={{
            borderColor: 'var(--line)',
            color: 'var(--ink-3)',
          }}
          title="Thêm lái xe"
          aria-label="Thêm lái xe"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
