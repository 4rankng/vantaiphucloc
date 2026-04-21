import { DetailRow, DetailList } from '@/components/shared/DetailRow'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { vehicleStatusMap } from '@/lib/statusMaps'
import type { VehicleData } from '../VehicleCard'

interface VehicleDetailProps {
  data: VehicleData
}

export function VehicleDetail({ data }: VehicleDetailProps) {
  const s = vehicleStatusMap[data.status] || { variant: 'neutral' as const, label: data.status }
  return (
    <DetailList>
      <DetailRow label="Biển số"><span className="font-semibold font-mono-num">{data.licensePlate}</span></DetailRow>
      <DetailRow label="Hãng">{data.make} {data.model}</DetailRow>
      <DetailRow label="Trạng thái"><StatusBadge {...s} /></DetailRow>
      <DetailRow label="Tài xế">{data.driverName || '—'}</DetailRow>
      <DetailRow label="Hạn đăng kiểm" noBorder>{data.inspectionDue || '—'}</DetailRow>
    </DetailList>
  )
}
