import { User, X, Plus } from 'lucide-react'

interface VehicleDriver {
  id: number
  driverName: string
}

interface VehicleDriverCardProps {
  plate: string
  drivers: VehicleDriver[]
  onRemoveDriver?: (id: number) => void
  onAddDriver?: () => void
}

export function VehicleDriverCard({
  plate,
  drivers,
  onRemoveDriver,
  onAddDriver,
}: VehicleDriverCardProps) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
        boxShadow: '0 0 0 1px rgba(9,9,11,0.02), 0 1px 2px rgba(9,9,11,0.04)',
      }}
    >
      <div className="px-4 pt-3.5 pb-2">
        <span
          className="inline-flex items-center rounded-md border px-2.5 py-1 text-[12px] font-bold tracking-wider"
          style={{
            background: 'var(--theme-bg-tertiary)',
            borderColor: 'var(--theme-border-default)',
            color: 'var(--theme-text-primary)',
          }}
        >
          {plate}
        </span>
      </div>

      <div className="px-4 pb-1">
        {drivers.map(d => (
          <div
            key={d.id}
            className="flex items-center gap-2.5 py-2"
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-lg"
              style={{
                background: 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)',
              }}
            >
              <User className="h-3 w-3" style={{ color: 'var(--theme-brand-primary)', opacity: 0.7 }} />
            </div>
            <span className="text-sm flex-1" style={{ color: 'var(--theme-text-primary)' }}>{d.driverName}</span>
            <span
              className="text-[10px] font-medium"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              lái xe
            </span>
            {onRemoveDriver && (
              <button
                onClick={() => onRemoveDriver(d.id)}
                className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-[var(--theme-status-error)]"
                style={{ color: 'var(--theme-text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--theme-text-muted)' }}
                title="Gỡ lái xe"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {onAddDriver && (
        <div className="px-4 pb-3 pt-0.5">
          <button
            onClick={onAddDriver}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: 'var(--theme-text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--theme-brand-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--theme-text-muted)' }}
          >
            <Plus className="h-3 w-3" />
            Thêm lái xe
          </button>
        </div>
      )}
    </div>
  )
}
