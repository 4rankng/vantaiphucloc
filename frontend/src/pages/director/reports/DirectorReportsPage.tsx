import { GlassCard } from '@/components/shared/GlassCard'
import { StatCard } from '@/components/shared/StatCard'
import { mockMonthlyRevenue, mockExpenses, mockInvoices, formatCurrencyShort, formatCurrencyFull } from '@/data/mockData'
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react'

export default function DirectorReportsPage() {
  const cur = mockMonthlyRevenue[mockMonthlyRevenue.length - 1]
  const prev = mockMonthlyRevenue[mockMonthlyRevenue.length - 2]
  const totalExpenses = mockExpenses.reduce((s, e) => s + e.amount, 0)
  const totalInvoiced = mockInvoices.reduce((s, i) => s + i.amount, 0)
  const maxRev = Math.max(...mockMonthlyRevenue.map(m => m.revenue))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<TrendingUp size={18}/>} label="Doanh thu tháng" value={formatCurrencyShort(cur.revenue)} variant="gold" trend="up" />
        <StatCard icon={<TrendingDown size={18}/>} label="Chi phí tháng" value={formatCurrencyShort(cur.expense)} variant="warning" />
        <StatCard icon={<DollarSign size={18}/>} label="Tổng HĐ" value={formatCurrencyShort(totalInvoiced)} />
        <StatCard icon={<BarChart3 size={18}/>} label="Biên lợi nhuận" value={`${((cur.revenue - cur.expense) / cur.revenue * 100).toFixed(1)}%`} variant="success" />
      </div>

      {/* Revenue/Expense Chart */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-display mb-4">Doanh thu & Chi phí 6 tháng</h3>
        <div className="space-y-3">
          {mockMonthlyRevenue.map((m) => {
            const profit = m.revenue - m.expense
            return (
              <div key={m.month} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--theme-text-muted)] font-mono-num">{m.month}</span>
                  <span className="text-[11px] font-semibold text-emerald-600 font-mono-num">LN: {formatCurrencyShort(profit)}</span>
                </div>
                <div className="flex gap-1 h-8 items-center">
                  <div className="h-full rounded-md bg-gradient-to-r from-navy-800 to-navy-600 flex items-end relative" style={{ width: `${(m.revenue / maxRev) * 100}%` }}>
                    <span className="absolute bottom-0.5 left-1.5 text-[9px] text-white/60 font-mono-num">{formatCurrencyShort(m.revenue)}</span>
                  </div>
                  <div className="h-full rounded-md bg-gold-300/50 border border-gold-300/70 flex items-end relative" style={{ width: `${(m.expense / maxRev) * 100}%` }}>
                    <span className="absolute bottom-0.5 left-1.5 text-[9px] text-navy-400 font-mono-num">{formatCurrencyShort(m.expense)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-4 text-[11px] text-[var(--theme-text-muted)]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-navy-800" /> Doanh thu</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gold-300/60 border border-gold-300" /> Chi phí</span>
        </div>
      </GlassCard>

      {/* Expense Breakdown */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-display mb-4">Chi phí theo danh mục</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Dầu', amount: 2050000, color: 'bg-blue-500' },
            { label: 'Đi đường', amount: 6060000, color: 'bg-emerald-500' },
            { label: 'Sửa chữa', amount: 6600000, color: 'bg-amber-500' },
            { label: 'Phí cầu đường', amount: 495000, color: 'bg-purple-500' },
            { label: 'Lương lx', amount: 6000000, color: 'bg-pink-500' },
            { label: 'Nhớt', amount: 450000, color: 'bg-cyan-500' },
            { label: 'Bảo hiểm', amount: 3200000, color: 'bg-indigo-500' },
            { label: 'Khác', amount: 1500000, color: 'bg-gray-500' },
          ].map((e) => (
            <div key={e.label} className="p-3 rounded-lg border border-[var(--theme-border-default)]/50">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${e.color}`} />
                <span className="text-[11px] text-[var(--theme-text-muted)]">{e.label}</span>
              </div>
              <p className="text-sm font-bold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(e.amount)}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
