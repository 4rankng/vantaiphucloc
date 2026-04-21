import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockJobs, mockDrivers, mockMonthlyRevenue, mockTractors, mockAlerts, formatCurrency, formatCurrencyShort, getJobStatusBadge } from '@/data/mockData'
import { Truck, TrendingUp, DollarSign, AlertTriangle, Route, Clock, CheckCircle, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const sparkRevenue = [65, 72, 80, 68, 85, 92]
const sparkExpense = [55, 60, 52, 58, 62, 65]
const sparkProfit = [10, 12, 28, 10, 23, 27]
const sparkTrips = [8, 12, 10, 14, 11, 9]

export default function DirectorDashboard() {
  const navigate = useNavigate()
  const active = mockJobs.filter(j => j.status === 'IN_PROGRESS')
  const planned = mockJobs.filter(j => j.status === 'PLANNED')
  const completed = mockJobs.filter(j => j.status === 'COMPLETED')
  const running = mockTractors.filter(t => t.status === 'running')
  const idle = mockTractors.filter(t => t.status === 'idle')
  const maintenance = mockTractors.filter(t => t.status === 'maintenance')
  const highAlerts = mockAlerts.filter(a => a.severity === 'high')
  const topDrivers = [...mockDrivers].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
  const maxRev = Math.max(...mockMonthlyRevenue.map(m => m.revenue))
  const cur = mockMonthlyRevenue[mockMonthlyRevenue.length - 1]

  return (
    <div className="space-y-5">
      {/* Time range */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold" style={{color:'var(--theme-text-primary)'}}>Tổng quan</h2>
        <div className="flex gap-1">
          {['Hôm nay', 'Tuần', 'Tháng'].map((r, i) => (
            <button key={r} className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${i === 2 ? 'text-white' : ''}`}
              style={i === 2 ? {background:'var(--theme-brand-primary)'} : {background:'var(--theme-bg-tertiary)', color:'var(--theme-text-secondary)'}}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Row — compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Truck size={18}/>} label="Đầu kéo" value={`${mockTractors.length}`} unit="xe"
          subtitle={`${running.length} chạy · ${idle.length} rảnh`} sparkline={sparkTrips} />
        <StatCard icon={<TrendingUp size={18}/>} label="Doanh thu" value={formatCurrencyShort(cur.revenue)} unit="VNĐ"
          variant="success" trend={{direction:'up', value:'12%'}} sparkline={sparkRevenue} />
        <StatCard icon={<DollarSign size={18}/>} label="Chi phí" value={formatCurrencyShort(cur.expense)} unit="VNĐ"
          variant="warning" sparkline={sparkExpense} />
        <StatCard icon={<ArrowUpRight size={18}/>} label="Lợi nhuận" value={formatCurrencyShort(cur.revenue - cur.expense)} unit="VNĐ"
          variant="teal" trend={{direction:'up', value:'18%'}} sparkline={sparkProfit} />
      </div>

      {/* Fleet capacity bar */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{color:'var(--theme-text-muted)'}}>Công suất đội xe</span>
          <span className="text-[11px] font-mono-num" style={{color:'var(--theme-text-secondary)'}}>{running.length}/{mockTractors.length} đang chạy</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden" style={{background:'#f1f5f9'}}>
          <div className="rounded-full" style={{width:`${(running.length/mockTractors.length)*100}%`, background:'#059669'}} />
          <div className="rounded-full" style={{width:`${(idle.length/mockTractors.length)*100}%`, background:'#f59e0b'}} />
          <div className="rounded-full" style={{width:`${(maintenance.length/mockTractors.length)*100}%`, background:'#ef4444'}} />
        </div>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1 text-[10px]" style={{color:'var(--theme-text-muted)'}}><span className="w-2 h-2 rounded-full" style={{background:'#059669'}}/> Đang chạy</span>
          <span className="flex items-center gap-1 text-[10px]" style={{color:'var(--theme-text-muted)'}}><span className="w-2 h-2 rounded-full" style={{background:'#f59e0b'}}/> Rảnh</span>
          <span className="flex items-center gap-1 text-[10px]" style={{color:'var(--theme-text-muted)'}}><span className="w-2 h-2 rounded-full" style={{background:'#ef4444'}}/> Sửa chữa</span>
        </div>
      </GlassCard>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Route size={16}/>} label="Đang chạy" value={`${active.length}`} unit="chuyến" variant="success" />
        <StatCard icon={<Clock size={16}/>} label="Chờ xử lý" value={`${planned.length}`} unit="chuyến" variant="warning" />
        <StatCard icon={<AlertTriangle size={16}/>} label="Cảnh báo" value={`${highAlerts.length}`} unit="mới" variant="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        <GlassCard className="p-5">
          <h3 className="text-[13px] font-bold mb-4" style={{color:'var(--theme-text-primary)'}}>Doanh thu 6 tháng</h3>
          <div className="space-y-2">
            {mockMonthlyRevenue.map((m) => (
              <div key={m.month} className="flex items-center gap-2">
                <span className="text-[11px] w-12 shrink-0 font-mono-num" style={{color:'var(--theme-text-muted)'}}>{m.month}</span>
                <div className="flex-1 flex gap-0.5 h-5 items-center">
                  <div className="h-full rounded transition-all duration-500" style={{ width: `${(m.revenue / maxRev) * 100}%`, background: 'var(--theme-brand-primary)' }} />
                  <div className="h-full rounded" style={{ width: `${(m.expense / maxRev) * 100}%`, background: 'var(--theme-brand-secondary)', opacity: 0.25 }} />
                </div>
                <span className="text-[11px] font-semibold w-16 text-right font-mono-num" style={{color:'var(--theme-text-primary)'}}>{formatCurrencyShort(m.revenue)}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Top Drivers */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold" style={{color:'var(--theme-text-primary)'}}>KPI Tài xế</h3>
            <button onClick={() => navigate('/director/driver-kpi')} className="text-[11px] font-semibold hover:underline" style={{color:'var(--theme-brand-secondary)'}}>Xem tất cả →</button>
          </div>
          <div className="space-y-1.5">
            {topDrivers.slice(0, 5).map((d, i) => (
              <div key={d.id} className="flex items-center gap-2.5 p-2 rounded-lg transition-colors hover:bg-[var(--theme-bg-tertiary)]">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i === 0 ? 'badge-gold' : i === 1 ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-400'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{color:'var(--theme-text-primary)'}}>{d.name}</p>
                  <p className="text-[10px]" style={{color:'var(--theme-text-muted)'}}>{d.tractorPlate} · {d.monthlyTrips} chuyến</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold font-mono-num" style={{color:'var(--theme-text-primary)'}}>{formatCurrencyShort(d.monthlyRevenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Recent trips */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-bold" style={{color:'var(--theme-text-primary)'}}>Chuyến gần đây</h3>
          <button onClick={() => navigate('/director/trips')} className="text-[11px] font-semibold hover:underline" style={{color:'var(--theme-brand-secondary)'}}>Xem tất cả →</button>
        </div>
        <div className="space-y-2">
          {mockJobs.slice(0, 5).map(job => (
            <div key={job.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold" style={{color:'var(--theme-text-primary)'}}>{job.containerNumber}</span>
                  <StatusBadge variant={getJobStatusBadge(job.status).variant} label={getJobStatusBadge(job.status).label} />
                </div>
                <p className="text-[11px] mt-0.5" style={{color:'var(--theme-text-muted)'}}>{job.description}</p>
              </div>
              <span className="text-[13px] font-semibold font-mono-num shrink-0" style={{color:'var(--theme-text-primary)'}}>{formatCurrencyShort(job.revenue)}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
