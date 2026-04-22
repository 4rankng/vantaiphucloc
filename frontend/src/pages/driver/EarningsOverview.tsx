import { useState } from 'react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { BackButton } from '@/components/shared/BackButton'
import { formatCurrencyShort } from '@/data/mockData'
import {
  TrendingUp, TrendingDown, Fuel, Wrench, ChevronRight,
  Star, AlertTriangle, DollarSign, Banknote, Droplets, CircleDot, Car, Shield, ShieldCheck,
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, any> = {
  'Dầu': Fuel,
  'Đi đường': Car,
  'Sửa chữa': Wrench,
  'Lốp': CircleDot,
  'Nhớt': Droplets,
  'Lương lx': Banknote,
  'Bảo hiểm': Shield,
  'Phí cầu đường': ShieldCheck,
}

type Period = 'today' | 'week' | 'month'

export function EarningsOverview() {
  const { jobs, expenses } = useDriverStore()
  const [period, setPeriod] = useState<Period>('month')

  const completedJobs = jobs.filter(j => j.status === 'COMPLETED')
  const totalEarnings = completedJobs.reduce((s, j) => s + j.driverFee, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netIncome = totalEarnings - totalExpenses
  const isPositive = netIncome >= 0
  const avgPerTrip = completedJobs.length > 0 ? Math.round(totalEarnings / completedJobs.length) : 0

  // Expense breakdown
  const expenseByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {})
  const sortedExpenses = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])
  const topExpense = sortedExpenses[0]

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'week', label: 'Tuần' },
    { key: 'month', label: 'Tháng' },
  ]

  return (
    <div className="p-4 space-y-5 pb-24">
      <BackButton />
      {/* ── Period filter ── */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }}>
        {periods.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className="flex-1 py-2 text-center text-xs font-semibold rounded-xl transition-all"
            style={{
              background: period === p.key ? 'var(--theme-bg-secondary)' : 'transparent',
              color: period === p.key ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
              boxShadow: period === p.key ? 'var(--theme-shadow-sm)' : 'none',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── HERO: Net income — front and center ── */}
      <div className="rounded-2xl p-5 text-center" style={{
        background: isPositive ? 'var(--theme-status-success-light)' : 'var(--theme-status-error-light)',
        boxShadow: 'var(--theme-shadow-card)',
      }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          {isPositive
            ? <TrendingUp className="w-5 h-5" style={{ color: 'var(--theme-status-success)' }} />
            : <TrendingDown className="w-5 h-5" style={{ color: 'var(--theme-status-error)' }} />
          }
          <span className="text-xs font-bold" style={{ color: isPositive ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}>
            Thu nhập ròng
          </span>
        </div>
        <p className="text-3xl font-bold tabular-nums" style={{ color: isPositive ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}>
          {formatCurrencyShort(netIncome)}
        </p>
        {/* Insight line */}
        <p className="text-xs mt-3" style={{ color: 'var(--theme-text-secondary)' }}>
          {completedJobs.length > 0
            ? `Trung bình ${formatCurrencyShort(avgPerTrip)}/chuyến · ${completedJobs.length} chuyến hoàn thành`
            : 'Chưa có chuyến hoàn thành'
          }
        </p>
      </div>

      {/* ── Summary: Thu / Chi (2-col, clean) ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          <p className="text-[11px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>Tổng thu</p>
          <p className="text-lg font-bold tabular-nums mt-1" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyShort(totalEarnings)}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          <p className="text-[11px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>Tổng chi</p>
          <p className="text-lg font-bold tabular-nums mt-1" style={{ color: totalExpenses > 0 ? 'var(--theme-status-error)' : 'var(--theme-text-primary)' }}>{formatCurrencyShort(totalExpenses)}</p>
        </div>
      </div>

      {/* ── Income breakdown — clean list ── */}
      <div>
        <span className="text-xs font-bold block mb-2.5" style={{ color: 'var(--theme-text-secondary)' }}>
          Chi tiết thu nhập
        </span>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          {[
            { label: 'Tiền chuyến', value: formatCurrencyShort(totalEarnings) },
            { label: 'Tiền đi đường', value: formatCurrencyShort(expenseByCategory['Đi đường'] || 0) },
            { label: 'Thưởng', value: '0 ₫' },
          ].map(({ label, value }, i, arr) => (
            <div key={label}>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{label}</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{value}</span>
              </div>
              {i < arr.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Expense breakdown — ranked list with icons ── */}
      {sortedExpenses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>
              Chi phí
            </span>
            {topExpense && (
              <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
                Cao nhất: {topExpense[0]}
              </span>
            )}
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
            {sortedExpenses.map(([cat, amount], i) => {
              const Icon = CATEGORY_ICONS[cat] || DollarSign
              const pct = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
              return (
                <div key={cat}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                    <span className="text-sm flex-1" style={{ color: 'var(--theme-text-secondary)' }}>{cat}</span>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>{pct}%</span>
                    <span className="text-sm font-semibold tabular-nums w-24 text-right" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyShort(amount)}</span>
                  </div>
                  {i < sortedExpenses.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />}
                </div>
              )
            })}
            {/* Total */}
            <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-default)' }} />
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Tổng chi phí</span>
              <span className="text-[15px] font-bold tabular-nums" style={{ color: 'var(--theme-status-error)' }}>{formatCurrencyShort(totalExpenses)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Insight card ── */}
      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--theme-bg-tertiary)' }}>
          <AlertTriangle className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
        </div>
        <div>
          <p className="text-xs font-bold mb-1" style={{ color: 'var(--theme-text-primary)' }}>Phân tích</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
            {completedJobs.length === 0
              ? 'Hoàn thành chuyến đầu tiên để xem phân tích chi tiết.'
              : topExpense
                ? `Chi phí lớn nhất là ${topExpense[0]} (${formatCurrencyShort(topExpense[1])}). Thu nhập ròng mỗi chuyến trung bình ${formatCurrencyShort(avgPerTrip)}.`
                : `Thu nhập ròng trung bình ${formatCurrencyShort(avgPerTrip)}/chuyến.`
            }
          </p>
        </div>
      </div>
    </div>
  )
}
