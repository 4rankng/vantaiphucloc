import { useDriverStore } from '@/hooks/use-driver-store'
import { formatCurrencyShort } from '@/data/mockData'
import {
  Wallet,
  TruckIcon,
  TrendingDown,
  Fuel,
  Wrench,
  CircleDot,
  Droplets,
  Banknote,
  Shield,
  ShieldCheck,
  Star,
  AlertTriangle,
  DollarSign,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react'

export function EarningsOverview() {
  const { jobs, expenses } = useDriverStore()
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED')
  const totalEarnings = completedJobs.reduce((s, j) => s + j.driverFee, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netIncome = totalEarnings - totalExpenses

  const breakdownItems = [
    { icon: DollarSign, label: 'Tiền chuyến', value: formatCurrencyShort(totalEarnings), color: 'var(--theme-status-success)' },
    { icon: ChevronRight, label: 'Tiền đi đường', value: formatCurrencyShort(expenses.filter(e => e.category === 'Đi đường').reduce((s, e) => s + e.amount, 0)), color: 'var(--theme-text-secondary)' },
    { icon: Fuel, label: 'Dầu', value: formatCurrencyShort(expenses.filter(e => e.category === 'Dầu').reduce((s, e) => s + e.amount, 0)), color: 'var(--theme-text-secondary)' },
    { icon: Wrench, label: 'Sửa chữa', value: formatCurrencyShort(expenses.filter(e => e.category === 'Sửa chữa').reduce((s, e) => s + e.amount, 0)), color: 'var(--theme-text-secondary)' },
    { icon: Star, label: 'Thưởng', value: formatCurrencyShort(0), color: 'var(--theme-text-secondary)' },
    { icon: AlertTriangle, label: 'Phạt', value: formatCurrencyShort(0), color: 'var(--theme-status-error)' },
  ]

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Hero card */}
      <div className="rounded-xl p-5" style={{ background: 'var(--theme-brand-gradient)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.8 }} />
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.8 }}>
            Tổng thu nhập tháng này
          </span>
        </div>
        <p className="text-3xl font-bold mt-1" style={{ color: 'var(--theme-text-on-brand)' }}>{formatCurrencyShort(totalEarnings)}</p>
        <p className="text-sm mt-2" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.7 }}>
          {completedJobs.length} chuyến hoàn thành
        </p>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: TruckIcon, label: 'Tổng chuyến', value: jobs.length, unit: 'chuyến', bg: 'var(--theme-brand-primary-light)', iconColor: 'var(--theme-brand-primary)' },
          { icon: ArrowUpRight, label: 'Thu nhập', value: formatCurrencyShort(totalEarnings), iconColor: 'var(--theme-status-success)', bg: 'var(--theme-bg-tertiary)' },
          { icon: TrendingDown, label: 'Chi phí', value: formatCurrencyShort(totalExpenses), iconColor: 'var(--theme-status-error)', bg: 'var(--theme-bg-tertiary)' },
        ].map(({ icon: Icon, label, value, unit, bg, iconColor }) => (
          <div key={label} className="rounded-xl p-3 border" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
            <div className="flex items-center justify-center mb-2">
              <div className="p-1.5 rounded-lg" style={{ background: bg }}>
                <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
              </div>
            </div>
            <p className="text-sm font-bold text-center" style={{ color: 'var(--theme-text-primary)' }}>{value}{unit ? ` ${unit}` : ''}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-center mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Net income highlight */}
      <div className="rounded-xl border p-4" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Thu nhập ròng</span>
          <span
            className="text-xl font-bold"
            style={{ color: netIncome >= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}
          >
            {formatCurrencyShort(netIncome)}
          </span>
        </div>
      </div>

      {/* Breakdown */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider block mb-3" style={{ color: 'var(--theme-text-muted)' }}>
          Chi tiết thu nhập
        </span>
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
          {breakdownItems.map(({ icon: Icon, label, value, color }, i, arr) => (
            <div key={label}>
              <div className="flex justify-between items-center px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{label}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{value}</span>
              </div>
              {i < arr.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-default)' }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
