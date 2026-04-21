import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockJobs, mockDrivers, mockMonthlyRevenue, mockTractors, mockAlerts, mockPeriodCloses, formatCurrency, formatCurrencyShort, getJobStatusBadge } from '@/data/mockData'
import { Truck, TrendingUp, DollarSign, AlertTriangle, Route, Clock, CheckCircle, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DirectorDashboard() {
  const navigate = useNavigate()
  const active = mockJobs.filter(j => j.status === 'IN_PROGRESS')
  const planned = mockJobs.filter(j => j.status === 'PLANNED')
  const completed = mockJobs.filter(j => j.status === 'COMPLETED')
  const running = mockTractors.filter(t => t.status === 'running')
  const idle = mockTractors.filter(t => t.status === 'idle')
  const highAlerts = mockAlerts.filter(a => a.severity === 'high')
  const topDrivers = [...mockDrivers].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
  const maxRev = Math.max(...mockMonthlyRevenue.map(m => m.revenue))
  const cur = mockMonthlyRevenue[mockMonthlyRevenue.length - 1]

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Truck size={24}/>} label="Đầu kéo" value={mockTractors.length} subtitle={`${running.length} chạy · ${idle.length} rảnh`} />
        <StatCard icon={<TrendingUp size={24}/>} label="Doanh thu" value={formatCurrency(cur.revenue)} variant="success" trend="up" />
        <StatCard icon={<DollarSign size={24}/>} label="Chi phí" value={formatCurrency(cur.expense)} variant="warning" />
        <StatCard icon={<ArrowUpRight size={24}/>} label="Lợi nhuận" value={formatCurrency(cur.revenue - cur.expense)} variant="teal" />
      </div>

      {/* Status Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Route size={24}/>} label="Đang chạy" value={active.length} variant="success" />
        <StatCard icon={<Clock size={24}/>} label="Lên kế hoạch" value={planned.length} variant="warning" />
        <StatCard icon={<CheckCircle size={24}/>} label="Hoàn thành (T4)" value={completed.length} />
        <StatCard icon={<AlertTriangle size={24}/>} label="Cảnh báo" value={highAlerts.length} variant="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Revenue Chart */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-display">Biểu đồ doanh thu 6 tháng</h3>
            <div className="flex gap-3 text-[10px] text-[var(--theme-text-muted)]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{background:'var(--theme-brand-primary)'}}/> Doanh thu</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{background:'var(--theme-brand-secondary)', opacity:0.5}}/> Chi phí</span>
            </div>
          </div>
          <div className="space-y-2.5">
            {mockMonthlyRevenue.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-[11px] text-[var(--theme-text-muted)] w-14 shrink-0 font-mono-num">{m.month}</span>
                <div className="flex-1 flex gap-1 h-6 items-center">
                  <div className="h-full rounded-md transition-all duration-500" style={{ width: `${(m.revenue / maxRev) * 100}%`, background: 'var(--theme-brand-primary)' }} />
                  <div className="h-full rounded-md" style={{ width: `${(m.expense / maxRev) * 100}%`, background: 'var(--theme-brand-secondary)', opacity: 0.3 }} />
                </div>
                <span className="text-[11px] font-semibold text-[var(--theme-text-primary)] w-20 text-right font-mono-num">{formatCurrencyShort(m.revenue)}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Top Drivers */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-display">KPI Tài xế tháng {cur.month}</h3>
            <button onClick={() => navigate('/director/driver-kpi')} className="text-xs font-semibold hover:underline" style={{color:'var(--theme-brand-secondary)'}}>Xem tất cả →</button>
          </div>
          <div className="space-y-2">
            {topDrivers.map((d, i) => (
              <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[var(--theme-bg-tertiary)]">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'badge-gold' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--theme-text-primary)] truncate">{d.name}</p>
                  <p className="text-[11px] text-[var(--theme-text-muted)]">{d.tractorPlate} · {d.monthlyTrips} chuyến</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(d.monthlyRevenue)}</p>
                  <p className="text-[11px]" style={{color:'var(--theme-brand-secondary)'}}>⭐ {d.rating}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Recent Jobs */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-display">Chuyến xe gần đây</h3>
          <button onClick={() => navigate('/director/trips')} className="text-xs font-semibold hover:underline" style={{color:'var(--theme-brand-secondary)'}}>Xem tất cả →</button>
        </div>
        {/* Mobile: cards */}
        <div className="lg:hidden space-y-2">
          {mockJobs.slice(0, 5).map((j) => {
            const s = getJobStatusBadge(j.status)
            return (
              <div key={j.id} className="p-4 rounded-xl" style={{background:'var(--theme-bg-tertiary)', border:'1px solid var(--theme-border-light)'}}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[var(--theme-text-primary)]">{j.id}</span>
                  <StatusBadge variant={j.status === 'IN_PROGRESS' ? 'success' : j.status === 'COMPLETED' ? 'info' : j.status === 'PLANNED' ? 'warning' : 'neutral'} label={s.label} />
                </div>
                <p className="text-xs text-[var(--theme-text-secondary)] truncate">{j.route}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-[var(--theme-text-muted)]">{j.driverName}</span>
                  <span className="text-xs font-bold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(j.revenue)}</span>
                </div>
              </div>
            )
          })}
        </div>
        {/* Desktop: table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider" style={{borderBottom:'1px solid var(--theme-border-default)'}}>
                <th className="pb-2 pr-3 font-semibold">Mã</th>
                <th className="pb-2 pr-3 font-semibold">Ngày</th>
                <th className="pb-2 pr-3 font-semibold">Tuyến</th>
                <th className="pb-2 pr-3 font-semibold">Tài xế</th>
                <th className="pb-2 pr-3 font-semibold">Trạng thái</th>
                <th className="pb-2 text-right font-semibold">Cước</th>
              </tr>
            </thead>
            <tbody>
              {mockJobs.slice(0, 8).map((j) => {
                const s = getJobStatusBadge(j.status)
                return (
                  <tr key={j.id} style={{borderBottom:'1px solid var(--theme-border-light)'}} className="last:border-0">
                    <td className="py-2.5 pr-3 font-semibold text-[var(--theme-text-primary)] font-mono-num">{j.id}</td>
                    <td className="py-2.5 pr-3 text-[var(--theme-text-muted)] font-mono-num">{j.jobDate}</td>
                    <td className="py-2.5 pr-3 text-[var(--theme-text-primary)] max-w-[220px] truncate">{j.route}</td>
                    <td className="py-2.5 pr-3 text-[var(--theme-text-muted)]">{j.driverName}</td>
                    <td className="py-2.5 pr-3"><StatusBadge variant={j.status === 'IN_PROGRESS' ? 'success' : j.status === 'COMPLETED' ? 'info' : j.status === 'PLANNED' ? 'warning' : 'neutral'} label={s.label} /></td>
                    <td className="py-2.5 text-right font-semibold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(j.revenue)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Period Close */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-display mb-4">Chốt sổ</h3>
        <div className="space-y-2">
          {mockPeriodCloses.map((pc) => (
            <div key={pc.id} className="flex items-center justify-between p-4 rounded-xl" style={{background:'var(--theme-bg-tertiary)', border:'1px solid var(--theme-border-light)'}}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-[var(--theme-text-primary)] font-mono-num">{pc.month}</span>
                <StatusBadge variant={pc.status === 'closed' ? 'success' : 'warning'} label={pc.status === 'closed' ? 'Đã chốt' : 'Đang mở'} />
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[var(--theme-text-muted)]">DT: <b className="text-[var(--theme-text-primary)]">{formatCurrencyShort(pc.totalRevenue)}</b></span>
                <span className="text-[var(--theme-text-muted)]">LN: <b className="text-emerald-600">{formatCurrencyShort(pc.profit)}</b></span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
