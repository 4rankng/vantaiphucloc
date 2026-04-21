import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockMonthlyRevenue, mockExpenses, mockInvoices, formatCurrencyShort } from '@/data/mockData'
import { DollarSign, TrendingUp, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AccountantDashboard() {
  const navigate = useNavigate()
  const cur = mockMonthlyRevenue[mockMonthlyRevenue.length - 1]
  const draftExpenses = mockExpenses.filter(e => e.status === 'DRAFT')
  const totalDraft = draftExpenses.reduce((s, e) => s + e.amount, 0)
  const overdue = mockInvoices.filter(i => i.status === 'OVERDUE')
  const paid = mockInvoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0)

  const invBadge = (s: string) => ({
    variant: s === 'PAID' ? 'success' : s === 'OVERDUE' ? 'danger' : s === 'ISSUED' ? 'info' : 'warning',
    label: s === 'PAID' ? 'Đã thu' : s === 'OVERDUE' ? 'Quá hạn' : s === 'ISSUED' ? 'Đã PH' : 'Nháp',
  } as const)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <span className="text-[10px] font-mono-num" style={{color:'var(--theme-text-muted)'}}>Lợi nhuận: {formatCurrencyShort(cur.revenue - cur.expense)}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<TrendingUp size={16}/>} label="Doanh thu" value={formatCurrencyShort(cur.revenue)} unit="VNĐ" variant="success" />
        <StatCard icon={<DollarSign size={16}/>} label="Chi phí" value={formatCurrencyShort(cur.expense)} unit="VNĐ" variant="warning" />
        <StatCard icon={<DollarSign size={16}/>} label="Chờ duyệt" value={`${draftExpenses.length}`} unit="phiếu" subtitle={formatCurrencyShort(totalDraft)} variant="danger" />
        <StatCard icon={<CheckCircle size={16}/>} label="Đã thu" value={formatCurrencyShort(paid)} unit="VNĐ" variant="teal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending expenses */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{color:'var(--theme-text-muted)'}}>Chi phí chờ duyệt</h3>
            <button onClick={() => navigate('/accountant/expenses')} className="text-[10px] font-semibold" style={{color:'var(--theme-brand-secondary)'}}>Xem tất cả →</button>
          </div>
          <div className="space-y-1">
            {draftExpenses.slice(0, 4).map((e) => (
              <div key={e.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold truncate" style={{color:'var(--theme-text-primary)'}}>{e.category}</p>
                  <p className="text-[10px]" style={{color:'var(--theme-text-muted)'}}>{e.tractorPlate} · {e.date}</p>
                </div>
                <span className="text-[12px] font-bold font-mono-num shrink-0 ml-2" style={{color:'var(--theme-text-primary)'}}>{formatCurrencyShort(e.amount)}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Recent invoices */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{color:'var(--theme-text-muted)'}}>Hóa đơn gần đây</h3>
            <button onClick={() => navigate('/accountant/invoices')} className="text-[10px] font-semibold" style={{color:'var(--theme-brand-secondary)'}}>Xem tất cả →</button>
          </div>
          <div className="space-y-1">
            {mockInvoices.slice(0, 5).map((inv) => {
              const b = invBadge(inv.status)
              return (
                <div key={inv.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{color:'var(--theme-text-primary)'}}>{inv.clientName}</p>
                    <p className="text-[10px]" style={{color:'var(--theme-text-muted)'}}>{inv.issueDate}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[12px] font-bold font-mono-num" style={{color:'var(--theme-text-primary)'}}>{formatCurrencyShort(inv.amount)}</span>
                    <StatusBadge variant={b.variant} label={b.label} />
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </div>

      {/* Overdue alert — only if any */}
      {overdue.length > 0 && (
        <GlassCard className="p-4" style={{borderLeft:'3px solid #ef4444'}}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{color:'#dc2626'}}>Quá hạn ({overdue.length})</h3>
          <div className="space-y-1">
            {overdue.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-1">
                <span className="text-[12px]" style={{color:'var(--theme-text-primary)'}}>{inv.clientName}</span>
                <span className="text-[12px] font-bold font-mono-num" style={{color:'#dc2626'}}>{formatCurrencyShort(inv.amount)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
