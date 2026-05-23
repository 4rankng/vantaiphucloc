import { StatusBadge } from '@/components/shared/StatusBadge'
import { MobileListCard } from '@/components/shared/DataList'
import { formatCurrencyShort } from '@/data/domain'
import { tripStatusVariant } from '@/lib/statusMaps'
import { Button } from '@/components/ui/Button'

export interface TripData {
  id: string
  jobDate: string
  route: string
  containerNumber: string
  clientName: string
  status: string
  trailerType: string
  revenue: number
  driverFee: number
  distanceKm: number
  description: string
}

interface TripCardProps {
  data: TripData
  onClick?: () => void
  showActions?: boolean
}

export function TripCard({ data, onClick, showActions }: TripCardProps) {
  return (
    <MobileListCard onClick={onClick}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--theme-text-primary)] font-mono-num">{data.id}</span>
          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{data.trailerType}</span>
        </div>
        <StatusBadge variant={tripStatusVariant(data.status)} label={data.status} />
      </div>
      <p className="text-[12px] text-[var(--theme-text-primary)] font-medium truncate">{data.route}</p>
      <div className="mt-2 space-y-1 text-[11px] text-[var(--theme-text-muted)]">
        <div className="flex justify-between">
          <span>{data.jobDate}</span>
          <span className="font-bold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(data.revenue)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cont: {data.containerNumber}</span>
          <span>{data.distanceKm} km</span>
        </div>
      </div>
      {showActions && (
        <div className="flex gap-2 mt-3">
          {data.status === 'PLANNED' && <Button size="sm" variant="gold" className="text-xs h-8">▶ Bắt đầu</Button>}
          {data.status === 'IN_PROGRESS' && <Button size="sm" variant="outline" className="text-xs h-8">✓ Hoàn thành</Button>}
        </div>
      )}
    </MobileListCard>
  )
}
