import { DetailRow, DetailList } from '@/components/shared/DetailRow'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { getJobStatusBadge, type JobStatus, formatCurrencyFull } from '@/data/domain'
import { tripStatusVariant } from '@/lib/statusMaps'
import type { TripData } from '../TripCard'

interface TripDetailProps {
  data: TripData
}

export function TripDetail({ data }: TripDetailProps) {
  const s = getJobStatusBadge(data.status as JobStatus)
  return (
    <DetailList>
      <DetailRow label="Mã chuyến"><span className="font-semibold font-mono-num">{data.id}</span></DetailRow>
      <DetailRow label="Ngày"><span className="font-mono-num">{data.jobDate}</span></DetailRow>
      <DetailRow label="Tuyến">{data.route}</DetailRow>
      <DetailRow label="Container"><span className="font-mono-num">{data.containerNumber}</span></DetailRow>
      <DetailRow label="Khách hàng">{data.clientName}</DetailRow>
      <DetailRow label="Khoảng cách">{data.distanceKm} km</DetailRow>
      <DetailRow label="Doanh thu"><span className="font-semibold font-mono-num">{formatCurrencyFull(data.revenue)}</span></DetailRow>
      <DetailRow label="Cước tài xế"><span className="font-mono-num">{formatCurrencyFull(data.driverFee)}</span></DetailRow>
      <DetailRow label="Trạng thái" noBorder>
        <StatusBadge variant={tripStatusVariant(data.status)} label={s.label} />
      </DetailRow>
    </DetailList>
  )
}
