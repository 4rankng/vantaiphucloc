import { DetailRow, DetailList } from '@/components/shared/DetailRow'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrencyFull } from '@/data/mockData'
import type { ClientData } from '../ClientCard'

export function ClientDetail({ data }: { data: ClientData }) {
  return (
    <DetailList>
      <DetailRow label="Tên"><span className="font-semibold">{data.name}</span></DetailRow>
      <DetailRow label="Loại">
        <StatusBadge variant={data.type === 'company' ? 'info' : 'neutral'} label={data.type === 'company' ? 'Doanh nghiệp' : 'Cá nhân'} />
      </DetailRow>
      {data.taxCode && <DetailRow label="Mã số thuế"><span className="font-mono-num">{data.taxCode}</span></DetailRow>}
      {data.address && <DetailRow label="Địa chỉ">{data.address}</DetailRow>}
      <DetailRow label="Điện thoại"><span className="font-mono-num">{data.phone}</span></DetailRow>
      {data.contactPerson && <DetailRow label="Người liên hệ">{data.contactPerson}</DetailRow>}
      <DetailRow label="Công nợ" noBorder>
        <span className="font-semibold text-red-600 font-mono-num">{formatCurrencyFull(data.outstandingDebt)}</span>
      </DetailRow>
    </DetailList>
  )
}
