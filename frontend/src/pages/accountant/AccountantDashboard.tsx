import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockMonthlyRevenue, mockExpenses, mockInvoices, formatCurrencyShort } from '@/data/mockData'
import { DollarSign, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AccountantDashboard() {
  const navigate = useNavigate()
  const cur = mockMonthlyRevenue[mockMonthlyRevenue.length - 1]
  const profit = cur.revenue - cur.expense
  const draftExpenses = mockExpenses.filter(e => e.status === 'DRAFT')
  const totalDraft = draftExpenses.reduce((s, e) => s + e.amount, 0)
  const overdue = mockInvoices.filter(i => i.status === 'OVERDUE')
  const paid = mockInvoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0)

  const invBadge = (s: string) => ({
    variant: s === 'PAID' ? 'success' : s === 'OVERDUE' ? 'danger' : s === 'ISSUED' ? 'info' : 'warning',
    label: s === 'PAID' ? 'Đã thu' : s === 'OVERDUE' ? 'Quá hạn' : s === 'ISSUED' ? 'Đã PH' : 'Nháp',
  } as const)

  return (
    <div className="space-y-6">
      {/* Hero — financial summary, read-only */}
      <div className="px-5 py-6 rounded-xl bg-white">
        <p className="text-sm text-gray-400 font-medium">{cur.month}</p>
        <p className="text-[26px] font-bold text-gray-900 tracking-tight mt-1 font-mono-num tabular-nums">
          {formatCurrencyShort(cur.revenue)}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <TrendingUp size={14} className="text-emerald-600" />
          <span className="text-sm font-medium text-emerald-600">+{formatCurrencyShort(profit)} lợi nhuận</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<DollarSign size={16}/>} label="Chi phí" value={formatCurrencyShort(cur.expense)} unit="VNĐ" variant="warning" />
        <StatCard icon={<DollarSign size={16}/>} label="Chờ duyệt" value={`${draftExpenses.length}`} unit="phiếu" subtitle={formatCurrencyShort(totalDraft)} variant="danger" />
        <StatCard icon={<CheckCircle size={16}/>} label="Đã thu" value={formatCurrencyShort(paid)} unit="VNĐ" variant="teal" />
      </div>

      {/* Expenses + Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending expenses */}
        <div className="px-5 py-5 rounded-xl bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Chi phí chờ duyệt</h3>
            <button onClick={() => navigate('/accountant/expenses')} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">Xem tất cả →</button>
          </div>
          <div className="space-y-0">
            {draftExpenses.slice(0, 4).map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{e.category}</p>
                  <p className="text-xs text-gray-400">{e.tractorPlate} · {e.date}</p>
                </div>
                <span className="text-sm font-bold text-gray-900 font-mono-num tabular-nums shrink-0 ml-2">{formatCurrencyShort(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Invoices */}
        <div className="px-5 py-5 rounded-xl bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Hóa đơn gần đây</h3>
            <button onClick={() => navigate('/accountant/invoices')} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">Xem tất cả →</button>
          </div>
          <div className="space-y-0">
            {mockInvoices.slice(0, 5).map((inv) => {
              const b = invBadge(inv.status)
              return (
                <div key={inv.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{inv.clientName}</p>
                    <p className="text-xs text-gray-400">{inv.issueDate}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-sm font-bold text-gray-900 font-mono-num tabular-nums">{formatCurrencyShort(inv.amount)}</span>
                    <StatusBadge variant={b.variant} label={b.label} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Overdue — alert style, left border accent */}
      {overdue.length > 0 && (
        <div className="px-5 py-4 rounded-xl bg-red-50 border-l-[3px] border-red-400">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={14} className="text-red-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-red-500">Quá hạn ({overdue.length})</h3>
          </div>
          <div className="space-y-1.5">
            {overdue.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-900">{inv.clientName}</span>
                <span className="text-sm font-bold text-red-600 font-mono-num tabular-nums">{formatCurrencyShort(inv.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
