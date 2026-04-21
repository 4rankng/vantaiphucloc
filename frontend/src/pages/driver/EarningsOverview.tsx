import { useDriverStore } from '@/hooks/use-driver-store'
import { formatCurrencyShort } from '@/data/mockData'
import { InlineStatStrip, StatCard } from '@/components/shared/InlineStatStrip'
import {
  Wallet, TruckIcon, TrendingDown, Fuel, Wrench,
  Star, AlertTriangle, DollarSign, ChevronRight,
} from 'lucide-react'

export function EarningsOverview() {
  const { jobs, expenses } = useDriverStore()
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED')
  const totalEarnings = completedJobs.reduce((s, j) => s + j.driverFee, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netIncome = totalEarnings - totalExpenses

  const breakdownItems = [
    { icon: DollarSign, label: 'Tiền chuyến', value: formatCurrencyShort(totalEarnings), color: 'var(--theme-status-success)' },
    { icon: ChevronRight, label: 'Tiền đi đường', value: formatCurrencyShort(expenses.filter(e => e.category === 'Đi đường').reduce((s, e) => s + e.amount, 0)) },
    { icon: Fuel, label: 'Dầu', value: formatCurrencyShort(expenses.filter(e => e.category === 'Dầu').reduce((s, e) => s + e.amount, 0)) },
    { icon: Wrench, label: 'Sửa chữa', value: formatCurrencyShort(expenses.filter(e => e.category === 'Sửa chữa').reduce((s, e) => s + e.amount, 0)) },
    { icon: Star, label: 'Thưởng', value: '0' },
    { icon: AlertTriangle, label: 'Phạt', value: '0', color: 'var(--theme-status-error)' },
  ]

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Hero gradient card */}
      <div className="rounded-xl p-5" style={{ background: 'var(--theme-brand-gradient)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.8 }} />
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.7 }}>
            Thu nhập tháng này
          </span>
        </div>
        <p className="text-3xl font-bold tabular-nums mt-1" style={{ color: 'var(--theme-text-on-brand)' }}>
          {formatCurrencyShort(totalEarnings)}
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.7 }}>
          {completedJobs.length} chuyến hoàn thành
        </p>
      </div>

      {/* Inline stat strip */}
      <InlineStatStrip items={[
        { label: 'Tổng chuyến', value: jobs.length },
        { label: 'Thu nhập', value: formatCurrencyShort(totalEarnings), highlight: true },
        { label: 'Chi phí', value: formatCurrencyShort(totalExpenses) },
        { label: 'Ròng', value: formatCurrencyShort(netIncome), highlight: netIncome >= 0 },
      ]} />

      {/* Breakdown */}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider block mb-2 px-0.5" style={{ color: 'var(--theme-text-muted)' }}>
          Chi tiết thu nhập
        </span>
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
          {breakdownItems.map(({ icon: Icon, label, value, color }, i, arr) => (
            <div key={label}>
              <div className="flex justify-between items-center px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" style={{ color: color ?? 'var(--theme-text-muted)' }} />
                  <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{label}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{value}</span>
              </div>
              {i < arr.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
