import { StatusBadge } from '@/components/shared/StatusBadge'
import { MobileListCard } from '@/components/shared/DataList'
import { formatCurrencyShort } from '@/data/domain'
import { Building2, Phone, User } from 'lucide-react'

export interface ClientData {
  id: string
  name: string
  type: 'company' | 'individual'
  phone: string
  contactPerson?: string
  outstandingDebt: number
  taxCode?: string
  address?: string
}

interface ClientCardProps {
  data: ClientData
  onClick?: () => void
}

export function ClientCard({ data, onClick }: ClientCardProps) {
  return (
    <MobileListCard onClick={onClick}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}>
            {data.type === 'company' ? <Building2 size={16} /> : <User size={16} />}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--theme-text-primary)] truncate max-w-[200px]">{data.name}</p>
            <p className="text-[11px] text-[var(--theme-text-muted)]">{data.type === 'company' ? 'Doanh nghiệp' : 'Cá nhân'}</p>
          </div>
        </div>
        {data.outstandingDebt > 0 && (
          <span className="text-xs font-bold text-red-600 font-mono-num">{formatCurrencyShort(data.outstandingDebt)}</span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-[var(--theme-text-muted)]">
        <span className="flex items-center gap-1"><Phone size={12} /> {data.phone}</span>
        {data.contactPerson && <span>· {data.contactPerson}</span>}
      </div>
    </MobileListCard>
  )
}

interface ClientTableProps {
  data: ClientData[]
  onRowClick?: (id: string) => void
}

export function ClientTable({ data, onRowClick }: ClientTableProps) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
            <th className="px-4 py-2.5 font-semibold">Tên</th>
            <th className="px-4 py-2.5 font-semibold">Loại</th>
            <th className="px-4 py-2.5 font-semibold">Liên hệ</th>
            <th className="px-4 py-2.5 font-semibold">Điện thoại</th>
            <th className="px-4 py-2.5 font-semibold text-right">Công nợ</th>
          </tr>
        </thead>
        <tbody>
          {data.map(c => (
            <tr
              key={c.id}
              className="hover:bg-[var(--theme-bg-tertiary)] cursor-pointer"
              style={{ borderBottom: '1px solid var(--theme-border-light)' }}
              onClick={() => onRowClick?.(c.id)}
            >
              <td className="px-4 py-2.5 font-semibold text-[var(--theme-text-primary)]">{c.name}</td>
              <td className="px-4 py-2.5"><StatusBadge variant={c.type === 'company' ? 'info' : 'neutral'} label={c.type === 'company' ? 'DN' : 'Cá nhân'} /></td>
              <td className="px-4 py-2.5 text-[var(--theme-text-muted)]">{c.contactPerson || '—'}</td>
              <td className="px-4 py-2.5 text-[var(--theme-text-muted)] font-mono-num">{c.phone}</td>
              <td className="px-4 py-2.5 text-right font-semibold font-mono-num">
                {c.outstandingDebt > 0 ? <span className="text-red-600">{formatCurrencyShort(c.outstandingDebt)}</span> : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
