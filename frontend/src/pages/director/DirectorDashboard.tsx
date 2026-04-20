import { LayoutDashboard, Truck, MapPin, Users, FileText, UserCog, TrendingUp, BookOpen } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockJobs, mockDrivers, mockMonthlyRevenue, mockAlerts, mockTractors, mockPeriodCloses, formatCurrency, getJobStatusBadge, getContainerBadgeColor } from '@/data/mockData'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

const sidebarItems = [
  { label: 'Tổng quan', icon: <LayoutDashboard size={20} />, path: '/director' },
  { label: 'Lịch vận chuyển', icon: <MapPin size={20} />, path: '/director/schedule' },
  { label: 'Phương tiện', icon: <Truck size={20} />, path: '/director/vehicles' },
  { label: 'Khách hàng', icon: <Users size={20} />, path: '/director/clients' },
  { label: 'Tài chính', icon: <FileText size={20} />, path: '/director/finance' },
  { label: 'Định mức', icon: <TrendingUp size={20} />, path: '/director/standards' },
  { label: 'KPI Tài xế', icon: <UserCog size={20} />, path: '/director/kpi' },
  { label: 'Chốt sổ', icon: <BookOpen size={20} />, path: '/director/period-close' },
]

const mobileItems = sidebarItems.slice(0, 5)

function JobStatusBadge({ status }: { status: string }) {
  const s = getJobStatusBadge(status as any)
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
}

function TrailerBadge({ type }: { type: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getContainerBadgeColor(type as any)}`}>{type}</span>
}

export default function DirectorDashboard() {
  const navigate = useNavigate()
  const activeJobs = mockJobs.filter(j => j.status === 'IN_PROGRESS')
  const plannedJobs = mockJobs.filter(j => j.status === 'PLANNED')
  const completedJobs = mockJobs.filter(j => j.status === 'COMPLETED')
  const runningTractors = mockTractors.filter(t => t.status === 'running')
  const idleTractors = mockTractors.filter(t => t.status === 'idle')
  const maintenanceTractors = mockTractors.filter(t => t.status === 'maintenance')
  const highAlerts = mockAlerts.filter(a => a.severity === 'high')
  const topDrivers = [...mockDrivers].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
  const maxRevenue = Math.max(...mockMonthlyRevenue.map(m => m.revenue))
  const currentMonth = mockMonthlyRevenue[mockMonthlyRevenue.length - 1]
  const prevMonth = mockMonthlyRevenue[mockMonthlyRevenue.length - 2]

  return (
    <div className="flex min-h-screen bg-[hsl(220,20%,98%)]">
      <Sidebar items={sidebarItems} title="Giám đốc" />
      <div className="flex-1 flex flex-col min-h-screen">
        <TopBar title="Tổng quan" />
        <main className="flex-1 p-4 lg:p-6 space-y-6 pb-24 lg:pb-6 overflow-auto">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Truck size={24} />} label="Đầu kéo" value={mockTractors.length} subtitle={`Chạy: ${runningTractors.length} • Rảnh: ${idleTractors.length} • SC: ${maintenanceTractors.length}`} />
            <StatCard icon={<TrendingUp size={24} />} label="Doanh thu tháng" value={formatCurrency(currentMonth.revenue)} variant="success" />
            <StatCard icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Chi phí" value={formatCurrency(currentMonth.expense)} />
            <StatCard icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} label="Lợi nhuận" value={formatCurrency(currentMonth.revenue - currentMonth.expense)} variant="success" />
          </div>

          {/* Job status */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<MapPin size={20} />} label="Đang chạy" value={activeJobs.length} variant="success" />
            <StatCard icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Lên kế hoạch" value={plannedJobs.length} variant="warning" />
            <StatCard icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Hoàn thành (T4)" value={completedJobs.length} />
            <StatCard icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>} label="Cảnh báo" value={highAlerts.length} variant="danger" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <GlassCard className="p-5">
              <h3 className="text-base font-bold text-[#0a1f33] mb-4">Biểu đồ doanh thu 6 tháng</h3>
              <div className="space-y-3">
                {mockMonthlyRevenue.map((m) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-[hsl(220,10%,55%)] w-16 shrink-0">{m.month}</span>
                    <div className="flex-1 flex gap-1 h-7 items-center">
                      <div className="h-full rounded-md bg-gradient-to-r from-[#0a2540] to-[#0d3158]" style={{ width: `${(m.revenue / maxRevenue) * 100}%` }} title={`DT: ${formatCurrency(m.revenue)}`} />
                      <div className="h-full rounded-md bg-[#d4a839]/30 border border-[#d4a839]/50" style={{ width: `${(m.expense / maxRevenue) * 100}%` }} title={`CP: ${formatCurrency(m.expense)}`} />
                    </div>
                    <span className="text-xs font-semibold text-[#0a1f33] w-24 text-right">{formatCurrency(m.revenue)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-[hsl(220,10%,55%)]">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#0a2540]" /> Doanh thu</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#d4a839]/40 border border-[#d4a839]/50" /> Chi phí</span>
              </div>
            </GlassCard>

            {/* Top Drivers */}
            <GlassCard className="p-5">
              <h3 className="text-base font-bold text-[#0a1f33] mb-4">KPI Tài xế tháng {currentMonth.month}</h3>
              <div className="space-y-3">
                {topDrivers.map((d, i) => (
                  <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[hsl(220,10%,97%)] transition-colors">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-[#d4a839] text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0a1f33] truncate">{d.name}</p>
                      <p className="text-xs text-[hsl(220,10%,55%)]">{d.tractorPlate} • {d.monthlyTrips} chuyến</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#0a2540]">{formatCurrency(d.monthlyRevenue)}</p>
                      <p className="text-xs text-[hsl(220,10%,55%)]">⭐ {d.rating}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Jobs Table */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0a1f33]">Chuyến xe gần đây</h3>
              <button onClick={() => navigate('/director/schedule')} className="text-xs text-[#0a2540] font-semibold hover:underline">Xem tất cả →</button>
            </div>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs text-[hsl(220,10%,55%)] uppercase tracking-wider border-b border-[hsl(220,10%,92%)]">
                    <th className="pb-2 pr-3">Mã</th>
                    <th className="pb-2 pr-3">Ngày</th>
                    <th className="pb-2 pr-3">Tuyến</th>
                    <th className="pb-2 pr-3">Cont</th>
                    <th className="pb-2 pr-3">Đầu kéo</th>
                    <th className="pb-2 pr-3">Tài xế</th>
                    <th className="pb-2 pr-3">Trạng thái</th>
                    <th className="pb-2 text-right">Cước</th>
                  </tr>
                </thead>
                <tbody>
                  {mockJobs.slice(0, 8).map((j) => (
                    <tr key={j.id} className="border-b border-[hsl(220,10%,96%)] last:border-0 hover:bg-[hsl(220,10%,97%)]">
                      <td className="py-2.5 pr-3 font-semibold text-[#0a2540]">{j.id}</td>
                      <td className="py-2.5 pr-3 text-[hsl(220,10%,55%)] whitespace-nowrap">{j.jobDate}</td>
                      <td className="py-2.5 pr-3 text-[#0a1f33] max-w-[200px] truncate" title={j.route}>
                        {j.route}
                        {j.isTwoWay && <span className="ml-1 text-[10px] text-purple-600 font-semibold bg-purple-50 px-1 rounded">2 chiều</span>}
                      </td>
                      <td className="py-2.5 pr-3"><TrailerBadge type={j.trailerType} /></td>
                      <td className="py-2.5 pr-3 text-[hsl(220,10%,45%)] whitespace-nowrap">{j.tractorPlate}</td>
                      <td className="py-2.5 pr-3 text-[hsl(220,10%,45%)] whitespace-nowrap">{j.driverName}</td>
                      <td className="py-2.5 pr-3"><JobStatusBadge status={j.status} /></td>
                      <td className="py-2.5 text-right font-semibold text-[#0a2540] whitespace-nowrap">{(j.revenue / 1000).toFixed(0)}k</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Period Close */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0a1f33]">Chốt sổ</h3>
              <span className="text-xs text-[hsl(220,10%,55%)]">Tháng hiện tại: {currentMonth.month}</span>
            </div>
            <div className="space-y-2">
              {mockPeriodCloses.map((pc) => (
                <div key={pc.id} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(220,20%,98%)] border border-[hsl(220,10%,92%)]">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-[#0a2540]">{pc.month}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${pc.status === 'closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {pc.status === 'closed' ? 'Đã chốt' : 'Đang mở'}
                    </span>
                    {pc.status === 'closed' && <span className="text-xs text-[hsl(220,10%,55%)]">bởi {pc.closedBy}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[hsl(220,10%,55%)]">DT: <b className="text-[#0a2540]">{formatCurrency(pc.totalRevenue)}</b></span>
                    <span className="text-[hsl(220,10%,55%)]">LN: <b className="text-emerald-600">{formatCurrency(pc.profit)}</b></span>
                    <span className="text-[hsl(220,10%,55%)]">{pc.jobCount} chuyến</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </main>
        <MobileBottomNav items={mobileItems} />
      </div>
    </div>
  )
}
