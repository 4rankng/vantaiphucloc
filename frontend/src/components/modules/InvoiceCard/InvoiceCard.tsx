import { StatusBadge } from '@/components/shared/StatusBadge'
import { MobileListCard } from '@/components/shared/DataList'
import { formatCurrencyShort } from '@/data/mockData'
import { invoiceStatusVariant, invoiceStatusLabel } from '@/lib/statusMaps'

export interface InvoiceData {
  id: string
  clientName: string
  category: string
  issueDate: string
  amount: number
  status: string
}

export function InvoiceCard({ data, onClick }: { data: InvoiceData; onClick?: () => void }) {
  return (
    <MobileListCard onClick={onClick}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-[var(--theme-text-primary)]">{data.id}</span>
        <StatusBadge variant={invoiceStatusVariant(data.status)} label={invoiceStatusLabel(data.status)} />
      </div>
      <p className="text-sm font-semibold text-[var(--theme-text-primary)]">{data.clientName}</p>
      <div className="flex items-center justify-between mt-2 text-[11px]">
        <span className="text-[var(--theme-text-muted)]">{data.category} · {data.issueDate}</span>
        <span className="font-bold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(data.amount)}</span>
      </div>
    </MobileListCard>
  )
}

export function InvoiceTable({ data, onRowClick }: { data: InvoiceData[]; onRowClick?: (id: string) => void }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
            <th className="px-4 py-2.5 font-semibold">Mã</th>
            <th className="px-4 py-2.5 font-semibold">Khách hàng</th>
            <th className="px-4 py-2.5 font-semibold">Loại</th>
            <th className="px-4 py-2.5 font-semibold">Ngày</th>
            <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
            <th className="px-4 py-2.5 font-semibold text-right">Số tiền</th>
          </tr>
        </thead>
        <tbody>
          {data.map(inv => (
            <tr key={inv.id} className="hover:bg-[var(--theme-bg-tertiary)] cursor-pointer" style={{ borderBottom: '1px solid var(--theme-border-light)' }} onClick={() => onRowClick?.(inv.id)}>
              <td className="px-4 py-2.5 font-semibold text-[var(--theme-text-primary)]">{inv.id}</td>
              <td className="px-4 py-2.5 text-[var(--theme-text-primary)]">{inv.clientName}</td>
              <td className="px-4 py-2.5 text-[var(--theme-text-muted)]">{inv.category}</td>
              <td className="px-4 py-2.5 text-[var(--theme-text-muted)] font-mono-num">{inv.issueDate}</td>
              <td className="px-4 py-2.5"><StatusBadge variant={invoiceStatusVariant(inv.status)} label={invoiceStatusLabel(inv.status)} /></td>
              <td className="px-4 py-2.5 text-right font-semibold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(inv.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
