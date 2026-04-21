import { StatusBadge } from '@/components/shared/StatusBadge'
import { MobileListCard } from '@/components/shared/DataList'
import { vehicleStatusMap } from '@/lib/statusMaps'
import { Truck } from 'lucide-react'

export interface VehicleData {
  id: string
  licensePlate: string
  make: string
  model: string
  status: string
  driverName?: string
  inspectionDue?: string
  type?: string // trailer type
}

interface VehicleCardProps {
  data: VehicleData
  isTrailer?: boolean
  onClick?: () => void
}

export function VehicleCard({ data, isTrailer, onClick }: VehicleCardProps) {
  const s = vehicleStatusMap[data.status] || { variant: 'neutral' as const, label: data.status }
  return (
    <MobileListCard onClick={onClick}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: isTrailer ? 'var(--theme-brand-primary-light)' : 'var(--theme-bg-tertiary)', color: isTrailer ? 'var(--theme-brand-secondary)' : 'var(--theme-text-secondary)' }}
          >
            <Truck size={16} />
          </div>
          <div>
            <span className="text-sm font-bold text-[var(--theme-text-primary)] font-mono-num">{data.licensePlate}</span>
            {data.type && <span className="ml-2 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{data.type}</span>}
          </div>
        </div>
        <StatusBadge {...s} />
      </div>
      <p className="text-[11px] text-[var(--theme-text-muted)]">
        {data.make} {data.model}
        {!isTrailer && (data.driverName ? ` · ${data.driverName}` : ' · Chưa gán TX')}
      </p>
    </MobileListCard>
  )
}
