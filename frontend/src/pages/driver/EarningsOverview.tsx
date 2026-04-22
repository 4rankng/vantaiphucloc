import { useDriverStore } from '@/hooks/use-driver-store'
import { formatCurrencyShort } from '@/data/mockData'
import {
  Wallet, TruckIcon, TrendingDown, Fuel, Wrench,
  Star, AlertTriangle, DollarSign, ChevronRight,
} from 'lucide-react'

function StatSection({ title, icon: Icon, items }: {
  title: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  items: { label: string; value: string; highlight?: boolean }[]
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 px-0.5">
        <Icon className="h-3 w-3" style={{ color: 'var(--theme-text-muted)', opacity: 0.6 }} />
        <span className="text-[11px] font-medium" style={{ color: 'var(--theme-text-muted)', opacity: 0.7 }}>
          {title}
        </span>
      </div>
      <div className="rounded-lg overflow-hidden gap-px" style={{ background: 'var(--theme-border-default)', border: '1px solid var(--theme-border-default)' }}>
        <div className="grid grid-cols-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-1 px-3 py-3 flex-1 min-w-0"
              style={{ background: item.highlight ? 'var(--theme-brand-primary-light)' : 'var(--theme-bg-secondary)' }}
            >
              <span
                className="text-[13px] font-semibold tabular-nums tracking-tight leading-tight w-full text-center"
                style={{ color: item.highlight ? 'var(--theme-brand-primary)' : 'var(--theme-text-primary)' }}
              >
                {item.value}
              </span>
              <span
                className="text-[11px] leading-none text-center truncate w-full px-1 mt-0.5"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BreakdownRow({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="flex justify-between items-center py-3">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4" style={{ color: color ?? 'var(--theme-text-muted)' }} />
        <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{value}</span>
    </div>
  )
}

export function EarningsOverview() {
  const { jobs, expenses } = useDriverStore()
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED')
  const totalEarnings = completedJobs.reduce((s, j) => s + j.driverFee, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netIncome = totalEarnings - totalExpenses

  const tienChuyen = totalEarnings
  const tienDiDuong = expenses.filter(e => e.category === 'Đi đường').reduce((s, e) => s + e.amount, 0)
  const dau = expenses.filter(e => e.category === 'Dầu').reduce((s, e) => s + e.amount, 0)
  const suaChua = expenses.filter(e => e.category === 'Sửa chữa').reduce((s, e) => s + e.amount, 0)

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Summary stats — matching payroll GroupedStatCard */}
      <StatSection
        title="Tổng quan"
        icon={Wallet}
        items={[
          { label: 'Tổng chuyến', value: String(jobs.length) },
          { label: 'Chuyến hoàn thành', value: String(completedJobs.length), highlight: true },
          { label: 'Tổng thu', value: formatCurrencyShort(totalEarnings) },
          { label: 'Thực nhận', value: formatCurrencyShort(netIncome), highlight: netIncome >= 0 },
        ]}
      />

      {/* Income breakdown */}
      <StatSection
        title="Thu nhập"
        icon={DollarSign}
        items={[
          { label: 'Tiền chuyến', value: formatCurrencyShort(tienChuyen), highlight: true },
          { label: 'Tiền đi đường', value: formatCurrencyShort(tienDiDuong) },
          { label: 'Thưởng', value: '0 ₫' },
          { label: 'Tổng thu', value: formatCurrencyShort(totalEarnings), highlight: true },
        ]}
      />

      {/* Expense breakdown */}
      <StatSection
        title="Chi phí"
        icon={Fuel}
        items={[
          { label: 'Dầu', value: formatCurrencyShort(dau) },
          { label: 'Sửa chữa', value: formatCurrencyShort(suaChua) },
          { label: 'Phạt', value: '0 ₫' },
          { label: 'Tổng chi', value: formatCurrencyShort(totalExpenses) },
        ]}
      />

      {/* Net result */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>Thu nhập ròng</p>
            <p className="text-xl font-bold tabular-nums mt-1" style={{ color: netIncome >= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}>
              {formatCurrencyShort(netIncome)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: netIncome >= 0 ? 'var(--theme-status-success-light)' : 'var(--theme-status-error-light)' }}>
            <TrendingDown className="w-6 h-6" style={{ color: netIncome >= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
