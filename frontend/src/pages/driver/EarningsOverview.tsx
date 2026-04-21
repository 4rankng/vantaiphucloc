import { useDriverStore } from '@/hooks/use-driver-store'
import { InlineStatStrip } from '@/components/shared/InlineStatStrip'
import { formatCurrencyShort } from '@/data/mockData'
import {
  Wallet, Fuel, Wrench, Star, AlertTriangle, DollarSign, ChevronRight,
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
    <div className="p-4 space-y-5 pb-24">
      {/* Stat strip */}
      <InlineStatStrip items={[
        { label: 'Tổng chuyến', value: jobs.length },
        { label: 'Thu nhập', value: formatCurrencyShort(totalEarnings), highlight: true },
        { label: 'Chi phí', value: formatCurrencyShort(totalExpenses) },
        { label: 'Ròng', value: formatCurrencyShort(netIncome), highlight: netIncome >= 0 },
      ]} />

      {/* Breakdown card */}
      <div>
        <span className="text-xs font-bold block mb-2.5 px-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
          Chi tiết thu nhập
        </span>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          {breakdownItems.map(({ icon: Icon, label, value, color }, i, arr) => (
            <div key={label}>
              <div className="flex justify-between items-center px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
                    <Icon className="w-4 h-4" style={{ color: color ?? 'var(--theme-text-secondary)' }} />
                  </div>
                  <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{label}</span>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{value}</span>
              </div>
              {i < arr.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
