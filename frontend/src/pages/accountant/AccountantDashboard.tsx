import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockMonthlyRevenue, mockExpenses, mockInvoices, formatCurrencyShort, formatCurrencyFull, getJobStatusBadge } from '@/data/mockData'
import { DollarSign, TrendingUp, FileText, CircleDollarSign, AlertTriangle, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const invStatusVariant = (s: string): 'success'|'warning'|'danger'|'info' =>
  s === 'PAID' ? 'success' : s === 'ISSUED' ? 'info' : s === 'OVERDUE' ? 'danger' : 'warning'
const invStatusLabel = (s: string) =>
  s === 'PAID' ? 'Đã thu' : s === 'ISSUED' ? 'Đã PH' : s === 'OVERDUE' ? 'Quá hạn' : 'Nháp'

export default function AccountantDashboard() {
  const navigate = useNavigate()
  const cur = mockMonthlyRevenue[mockMonthlyRevenue.length - 1]
  const pendingExpenses = mockExpenses.filter(e => e.status === 'DRAFT').length
  const totalPending = mockExpenses.filter(e => e.status === 'DRAFT').reduce((s, e) => s + e.amount, 0)
  const overdue = mockInvoices.filter(i => i.status === 'OVERDUE').length
  const paid = mockInvoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<TrendingUp size={24}/>} label="Doanh thu tháng" value={formatCurrencyShort(cur.revenue)} variant="success" />
        <StatCard icon={<DollarSign size={24}/>} label="Chi phí" value={formatCurrencyShort(cur.expense)} variant="warning" />
        <StatCard icon={<CircleDollarSign size={24}/>} label="Chi phí chờ duyệt" value={`${pendingExpenses} phiếu`} subtitle={formatCurrencyShort(totalPending)} variant="danger" />
        <StatCard icon={<CheckCircle size={24}/>} label="Đã thu" value={formatCurrencyShort(paid)} variant="teal" />
      </div>

      {/* Pending expenses */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-display">Chi phí chờ duyệt</h3>
          <button onClick={() => navigate('/accountant/expenses')} className="text-xs font-semibold hover:underline" style={{color:'var(--theme-brand-secondary)'}}>Xem tất cả →</button>
        </div>
        <div className="space-y-2">
          {mockExpenses.filter(e => e.status === 'DRAFT').slice(0, 4).map((e) => (
            <div key={e.id} className="flex items-center justify-between p-4 rounded-xl" style={{background:'var(--theme-bg-tertiary)', border:'1px solid var(--theme-border-light)'}}>
              <div>
                <p className="text-xs font-semibold text-[var(--theme-text-primary)]">{e.category} — {e.description}</p>
                <p className="text-[11px] text-[var(--theme-text-muted)]">{e.tractorPlate} · {e.date}</p>
              </div>
              <span className="text-sm font-bold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(e.amount)}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Recent invoices */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-display">Hóa đơn gần đây</h3>
          <button onClick={() => navigate('/accountant/invoices')} className="text-xs font-semibold hover:underline" style={{color:'var(--theme-brand-secondary)'}}>Xem tất cả →</button>
        </div>
        <div className="space-y-2">
          {mockInvoices.slice(0, 5).map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl" style={{border:'1px solid var(--theme-border-light)'}}>
              <div>
                <p className="text-xs font-semibold text-[var(--theme-text-primary)]">{inv.id} — {inv.clientName}</p>
                <p className="text-[11px] text-[var(--theme-text-muted)]">{inv.category} · {inv.issueDate}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(inv.amount)}</p>
                <StatusBadge variant={invStatusVariant(inv.status)} label={invStatusLabel(inv.status)} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {overdue > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500" />
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">Hóa đơn quá hạn ({overdue})</h3>
          </div>
          {mockInvoices.filter(i => i.status === 'OVERDUE').map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 text-sm">
              <span className="text-[var(--theme-text-primary)]">{inv.clientName}</span>
              <span className="font-bold text-red-600 font-mono-num">{formatCurrencyFull(inv.amount)}</span>
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  )
}
