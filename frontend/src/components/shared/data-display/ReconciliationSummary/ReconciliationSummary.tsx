import { formatCurrencyFull } from '@/data/domain'

export interface ReconciliationSummaryProps {
  total: number
  matched: number
  pending: number
  internalCount: number
  vendorCount: number
  f20Count: number
  f40Count: number
  e20Count: number
  e40Count: number
  totalRevenue: number
  totalProductivitySalary: number
}

interface SummaryValueProps {
  label: string
  value: string
  valueColor?: string
}

function SummaryValue({ label, value, valueColor }: SummaryValueProps) {
  return (
    <div className="min-w-0">
      <dt className="type-overline" style={{ color: 'var(--theme-text-muted)' }}>{label}</dt>
      <dd className="mt-1 text-sm font-bold leading-tight tabular-nums break-words" style={{ color: valueColor ?? 'var(--theme-text-primary)' }}>
        {value}
      </dd>
    </div>
  )
}

export function ReconciliationSummary({
  total,
  matched,
  pending,
  internalCount,
  vendorCount,
  f20Count,
  f40Count,
  e20Count,
  e40Count,
  totalRevenue,
  totalProductivitySalary,
}: ReconciliationSummaryProps) {
  return (
    <section aria-label="Tổng quan đối soát" className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
      <div className="rounded-xl p-3" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="type-overline" style={{ color: 'var(--theme-text-muted)' }}>Chuyến xe</h2>
          <p className="text-xl font-extrabold tracking-tight tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{total.toLocaleString('vi-VN')}</p>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3" style={{ borderColor: 'var(--theme-border-light)' }}>
          <SummaryValue label="Đã ghép" value={matched.toLocaleString('vi-VN')} valueColor="var(--theme-status-success)" />
          <SummaryValue label="Chờ ghép" value={pending.toLocaleString('vi-VN')} valueColor="var(--theme-status-warning)" />
          <SummaryValue label="Xe nội bộ" value={internalCount.toLocaleString('vi-VN')} />
          <SummaryValue label="Xe ngoài" value={vendorCount.toLocaleString('vi-VN')} />
        </dl>
      </div>

      <div className="rounded-xl p-3" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
        <h2 className="type-overline" style={{ color: 'var(--theme-text-muted)' }}>Cơ cấu container</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3" style={{ borderColor: 'var(--theme-border-light)' }}>
          <SummaryValue label="F20" value={f20Count.toLocaleString('vi-VN')} valueColor="var(--theme-brand-primary)" />
          <SummaryValue label="F40" value={f40Count.toLocaleString('vi-VN')} valueColor="var(--theme-brand-primary)" />
          <SummaryValue label="E20" value={e20Count.toLocaleString('vi-VN')} valueColor="var(--theme-brand-primary)" />
          <SummaryValue label="E40" value={e40Count.toLocaleString('vi-VN')} valueColor="var(--theme-brand-primary)" />
        </dl>
      </div>

      <div className="rounded-xl p-3" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
        <h2 className="type-overline" style={{ color: 'var(--theme-text-muted)' }}>Giá trị</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 border-t pt-3" style={{ borderColor: 'var(--theme-border-light)' }}>
          <SummaryValue label="Tổng cước" value={formatCurrencyFull(totalRevenue)} valueColor="var(--theme-brand-primary)" />
          <SummaryValue label="Lương SL" value={formatCurrencyFull(totalProductivitySalary)} valueColor="var(--theme-status-warning)" />
        </dl>
      </div>
    </section>
  )
}
