import { LayoutDashboard, CheckCircle, Receipt, Users, FileText, BookMarked } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockExpenses, mockInvoices, mockClients, mockPeriodCloses, mockLedger, formatCurrency, formatCurrencyFull, INVOICE_CATEGORIES } from '@/data/mockData'
import { useNavigate } from 'react-router-dom'

const sidebarItems = [
  { label: 'Tổng quan', icon: <LayoutDashboard size={20} />, path: '/accountant' },
  { label: 'Chuyến hoàn thành', icon: <CheckCircle size={20} />, path: '/accountant/completed' },
  { label: 'Phiếu chi', icon: <Receipt size={20} />, path: '/accountant/expenses' },
  { label: 'Khách hàng & Công nợ', icon: <Users size={20} />, path: '/accountant/debt' },
  { label: 'Phiếu thu', icon: <FileText size={20} />, path: '/accountant/receipts' },
  { label: 'Chốt sổ', icon: <BookMarked size={20} />, path: '/accountant/period-close' },
]

const mobileItems = sidebarItems.slice(0, 5)

function InvoiceStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Nháp' },
    ISSUED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đã phát hành' },
    PAID: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Đã thu' },
    OVERDUE: { bg: 'bg-red-100', text: 'text-red-700', label: 'Quá hạn' },
    CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Huỷ' },
  }
  const s = cfg[status] || cfg.DRAFT
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
}

export default function AccountantDashboard() {
  const navigate = useNavigate()
  const pendingExpenses = mockExpenses.filter(e => e.status === 'DRAFT')
  const totalDebt = mockClients.reduce((s, c) => s + c.outstandingDebt, 0)
  const overdueInvoices = mockInvoices.filter(i => i.status === 'OVERDUE')
  const issuedInvoices = mockInvoices.filter(i => i.status === 'ISSUED')
  const paidInvoices = mockInvoices.filter(i => i.status === 'PAID')
  const currentPeriod = mockPeriodCloses.find(p => p.status === 'open')

  return (
    <div className="flex min-h-screen bg-[hsl(220,20%,98%)]">
      <Sidebar items={sidebarItems} title="Kế toán" />
      <div className="flex-1 flex flex-col min-h-screen">
        <TopBar title="Tổng quan" />
        <main className="flex-1 p-4 lg:p-6 space-y-6 pb-24 lg:pb-6 overflow-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Receipt size={24} />} label="Phiếu chi chờ duyệt" value={pendingExpenses.length} subtitle={formatCurrency(pendingExpenses.reduce((s, e) => s + e.amount, 0))} variant="warning" />
            <StatCard icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Công nợ chưa thu" value={formatCurrency(totalDebt)} variant="danger" />
            <StatCard icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>} label="Hóa đơn quá hạn" value={overdueInvoices.length} variant="danger" />
            <StatCard icon={<FileText size={24} />} label="Hóa đơn tháng" value={mockInvoices.length} subtitle={`Đã thu: ${paidInvoices.length} • Chưa thu: ${issuedInvoices.length + overdueInvoices.length}`} />
          </div>

          {/* Period Close */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0a1f33]">Chốt sổ tháng</h3>
              {currentPeriod && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                    Tháng {currentPeriod.month} đang mở
                  </span>
                  <button className="px-3 py-1.5 text-xs font-semibold bg-[#0a2540] text-white rounded-lg hover:bg-[#0d3158] transition-colors">
                    Chốt sổ {currentPeriod.month}
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {mockPeriodCloses.map((pc) => (
                <div key={pc.id} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(220,20%,98%)] border border-[hsl(220,10%,92%)]">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#0a2540]">{pc.month}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${pc.status === 'closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {pc.status === 'closed' ? 'Đã chốt' : 'Đang mở'}
                    </span>
                    {pc.status === 'closed' && <span className="text-xs text-[hsl(220,10%,55%)]">bởi {pc.closedBy}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span>DT: <b className="text-[#0a2540]">{formatCurrency(pc.totalRevenue)}</b></span>
                    <span>LN: <b className="text-emerald-600">{formatCurrency(pc.profit)}</b></span>
                    <span>{pc.jobCount} chuyến</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Pending expenses */}
          <GlassCard className="p-5">
            <h3 className="text-base font-bold text-[#0a1f33] mb-4">Phiếu chi chờ duyệt</h3>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-left text-xs text-[hsl(220,10%,55%)] uppercase tracking-wider border-b border-[hsl(220,10%,92%)]">
                    <th className="pb-2 pr-3">Hạng mục</th>
                    <th className="pb-2 pr-3">Đầu kéo</th>
                    <th className="pb-2 pr-3">Mô tả</th>
                    <th className="pb-2 pr-3">Ngày</th>
                    <th className="pb-2 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingExpenses.slice(0, 6).map((e) => (
                    <tr key={e.id} className="border-b border-[hsl(220,10%,96%)] last:border-0">
                      <td className="py-2.5 pr-3"><span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[hsl(220,10%,94%)] text-xs font-medium">{e.category}</span></td>
                      <td className="py-2.5 pr-3 font-medium text-[#0a1f33]">{e.tractorPlate}</td>
                      <td className="py-2.5 pr-3 text-[hsl(220,10%,55%)]">{e.description}</td>
                      <td className="py-2.5 pr-3 text-[hsl(220,10%,55%)] whitespace-nowrap">{e.date}</td>
                      <td className="py-2.5 text-right font-semibold text-[#0a2540]">{formatCurrencyFull(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Invoices */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0a1f33]">Hóa đơn gần đây</h3>
              <button onClick={() => navigate('/accountant/receipts')} className="text-xs text-[#0a2540] font-semibold hover:underline">Xem tất cả →</button>
            </div>
            <div className="space-y-2">
              {mockInvoices.slice(0, 6).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(220,20%,98%)] border border-[hsl(220,10%,92%)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#0a1f33]">{inv.clientName}</p>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[hsl(220,10%,94%)]">{inv.category}</span>
                    </div>
                    <p className="text-xs text-[hsl(220,10%,55%)] mt-0.5">{inv.id} • {inv.containerSize} • {inv.route || inv.category} • {inv.distanceKm > 0 ? `${inv.distanceKm}km` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#0a2540]">{formatCurrencyFull(inv.amount)}</span>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Ledger */}
          <GlassCard className="p-5">
            <h3 className="text-base font-bold text-[#0a1f33] mb-4">Sổ cái gần đây</h3>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-left text-xs text-[hsl(220,10%,55%)] uppercase tracking-wider border-b border-[hsl(220,10%,92%)]">
                    <th className="pb-2 pr-3">Ngày</th>
                    <th className="pb-2 pr-3">Đối tượng</th>
                    <th className="pb-2 pr-3">Loại</th>
                    <th className="pb-2 pr-3">TK</th>
                    <th className="pb-2 text-right">Nợ</th>
                    <th className="pb-2 text-right">Có</th>
                  </tr>
                </thead>
                <tbody>
                  {mockLedger.map((e) => {
                    const typeLabel: Record<string, string> = { INVOICE: 'Hóa đơn', PAYMENT_RECEIVED: 'Thu tiền', PARTNER_PAYMENT: 'Trả đối tác' }
                    return (
                      <tr key={e.id} className="border-b border-[hsl(220,10%,96%)] last:border-0">
                        <td className="py-2.5 pr-3 whitespace-nowrap text-[hsl(220,10%,55%)]">{e.date}</td>
                        <td className="py-2.5 pr-3 text-[#0a1f33]">{e.clientName}</td>
                        <td className="py-2.5 pr-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[hsl(220,10%,94%)]">{typeLabel[e.type] || e.type}</span></td>
                        <td className="py-2.5 pr-3 text-[hsl(220,10%,55%)]">{e.reference}</td>
                        <td className="py-2.5 text-right font-semibold text-red-600">{e.debit > 0 ? formatCurrencyFull(e.debit) : ''}</td>
                        <td className="py-2.5 text-right font-semibold text-emerald-600">{e.credit > 0 ? formatCurrencyFull(e.credit) : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </main>
        <MobileBottomNav items={mobileItems} />
      </div>
    </div>
  )
}
