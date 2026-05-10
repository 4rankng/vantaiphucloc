import { DetailRow, DetailList } from '@/components/shared/DetailRow'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrencyFull } from '@/data/domain'
import type { ClientData } from '../ClientCard'

function DetailValue({ value, mono }: { value: string | null | undefined; mono?: boolean }) {
  if (value) return <span className={mono ? 'font-mono-num' : ''}>{value}</span>
  return <span className="text-xs italic" style={{ color: 'var(--theme-text-muted)' }}>Chưa có</span>
}

export function ClientDetail({ data }: { data: ClientData }) {
  return (
    <DetailList>
      <DetailRow label="Tên"><span className="font-semibold">{data.name}</span></DetailRow>
      <DetailRow label="Loại">
        <StatusBadge variant={data.type === 'company' ? 'info' : 'neutral'} label={data.type === 'company' ? 'Doanh nghiệp' : 'Cá nhân'} />
      </DetailRow>
      <DetailRow label="Mã số thuế"><DetailValue value={data.taxCode} mono /></DetailRow>
      <DetailRow label="Địa chỉ"><DetailValue value={data.address} /></DetailRow>
      <DetailRow label="Điện thoại"><DetailValue value={data.phone} mono /></DetailRow>
      <DetailRow label="Người liên hệ"><DetailValue value={data.contactPerson} /></DetailRow>
      <DetailRow label="Công nợ" noBorder>
        <span className="font-semibold text-red-600 font-mono-num">{formatCurrencyFull(data.outstandingDebt)}</span>
      </DetailRow>
    </DetailList>
  )
}
