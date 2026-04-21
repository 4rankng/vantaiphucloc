import { useDriverStore } from '@/hooks/use-driver-store'
import { formatCurrencyShort } from '@/data/mockData'

export function EarningsOverview() {
  const { jobs, expenses } = useDriverStore()
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED')
  const totalEarnings = completedJobs.reduce((s, j) => s + j.driverFee, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const roadExpenses = expenses.filter(e => e.category === 'Đi đường').reduce((s, e) => s + e.amount, 0)
  const fuelExpenses = expenses.filter(e => e.category === 'Dầu').reduce((s, e) => s + e.amount, 0)

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">Thu nhập</h2>

      <div className="bg-gradient-to-br from-[var(--theme-brand-primary)] to-[var(--theme-brand-secondary)] rounded-2xl p-5 text-white">
        <p className="text-sm opacity-80">Tổng thu nhập tháng này</p>
        <p className="text-3xl font-bold mt-1">{formatCurrencyShort(totalEarnings)}</p>
        <p className="text-sm opacity-70 mt-2">{completedJobs.length} chuyến hoàn thành</p>
      </div>

      <div className="bg-[var(--theme-bg-secondary)] rounded-xl p-4 border border-[var(--theme-border-default)]">
        <h3 className="text-sm font-semibold mb-3">Tổng quan tháng</h3>
        <div className="space-y-3">
          {[
            { label: 'Tổng chuyến', value: jobs.length, unit: 'chuyến' },
            { label: 'Thu nhập', value: formatCurrencyShort(totalEarnings), color: 'text-emerald-600' },
            { label: 'Tổng chi phí', value: formatCurrencyShort(totalExpenses), color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="flex justify-between items-center">
              <span className="text-sm text-[var(--theme-text-muted)]">{s.label}</span>
              <span className={`font-semibold text-sm ${s.color ?? ''}`}>{s.value} {s.unit}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[var(--theme-bg-secondary)] rounded-xl p-4 border border-[var(--theme-border-default)]">
        <h3 className="text-sm font-semibold mb-3">Chi tiết thu nhập</h3>
        <div className="space-y-3">
          {[
            { label: '💰 Tiền chuyến', value: formatCurrencyShort(totalEarnings) },
            { label: '🛣️ Tiền đi đường', value: formatCurrencyShort(roadExpenses) },
            { label: '⛽ Dầu', value: formatCurrencyShort(fuelExpenses) },
            { label: '🔧 Sửa chữa', value: formatCurrencyShort(expenses.filter(e => e.category === 'Sửa chữa').reduce((s, e) => s + e.amount, 0)) },
            { label: '⭐ Thưởng', value: formatCurrencyShort(0) },
            { label: '⚠️ Phạt', value: formatCurrencyShort(0) },
          ].map(s => (
            <div key={s.label} className="flex justify-between items-center">
              <span className="text-sm text-[var(--theme-text-secondary)]">{s.label}</span>
              <span className="font-semibold text-sm">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
