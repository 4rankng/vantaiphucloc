import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockJobs, mockDrivers, mockMonthlyRevenue, mockTractors, mockAlerts, formatCurrencyShort, getJobStatusBadge } from '@/data/mockData'
import { TrendingUp, DollarSign, ArrowUpRight, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DirectorDashboard() {
  const navigate = useNavigate()
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
        <h2 className="text-sm font-bold" style={{color:'var(--theme-text-primary)'}}>Tổng quan tháng {cur.month}</h2>
        <div className="flex gap-1">
          {['Hôm nay', 'Tuần', 'Tháng'].map((r, i) => (
            <button key={r} className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-colors ${i === 2 ? 'text-white' : ''}`}
              style={i === 2 ? {background:'var(--theme-brand-primary)'} : {background:'var(--theme-bg-tertiary)', color:'var(--theme-text-secondary)'}}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Single KPI row — no duplicates */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<TrendingUp size={16}/>} label="Doanh thu" value={formatCurrencyShort(cur.revenue)} unit="VNĐ"
          variant="success" trend={{direction:'up', value:'12%'}} sparkline={[65, 72, 80, 68, 85, 92]} />
        <StatCard icon={<DollarSign size={16}/>} label="Chi phí" value={formatCurrencyShort(cur.expense)} unit="VNĐ"
          variant="warning" sparkline={[55, 60, 52, 58, 62, 65]} />
        <StatCard icon={<ArrowUpRight size={16}/>} label="Lợi nhuận" value={formatCurrencyShort(cur.revenue - cur.expense)} unit="VNĐ"
          variant="teal" trend={{direction:'up', value:'18%'}} sparkline={[10, 12, 28, 10, 23, 27]} />
        <StatCard icon={<AlertTriangle size={16}/>} label="Cảnh báo" value={`${highAlerts.length}`} unit="chưa xử lý"
          variant="danger" />
      </div>

      {/* Fleet + Revenue side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fleet status — compact */}
        <GlassCard className="p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{color:'var(--theme-text-muted)'}}>Đội xe ({mockTractors.length})</h3>
          <div className="flex h-2 rounded-full overflow-hidden mb-2" style={{background:'#f1f5f9'}}>
            <div className="rounded-full" style={{width:`${(running.length/mockTractors.length)*100}%`, background:'#059669'}} />
            <div className="rounded-full" style={{width:`${(idle.length/mockTractors.length)*100}%`, background:'#f59e0b'}} />
            <div className="rounded-full" style={{width:`${(maintenance.length/mockTractors.length)*100}%`, background:'#ef4444'}} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center">
              <p className="text-lg font-bold font-mono-num" style={{color:'#059669'}}>{running.length}</p>
              <p className="text-[10px]" style={{color:'var(--theme-text-muted)'}}>Đang chạy</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold font-mono-num" style={{color:'#d97706'}}>{idle.length}</p>
              <p className="text-[10px]" style={{color:'var(--theme-text-muted)'}}>Rảnh</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold font-mono-num" style={{color:'#ef4444'}}>{maintenance.length}</p>
              <p className="text-[10px]" style={{color:'var(--theme-text-muted)'}}>Sửa chữa</p>
            </div>
          </div>
        </GlassCard>

        {/* Revenue chart — spans 2 cols */}
        <GlassCard className="p-4 lg:col-span-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{color:'var(--theme-text-muted)'}}>Doanh thu 6 tháng</h3>
          <div className="space-y-1.5">
            {mockMonthlyRevenue.map((m) => (
              <div key={m.month} className="flex items-center gap-2">
                <span className="text-[10px] w-10 shrink-0 font-mono-num" style={{color:'var(--theme-text-muted)'}}>{m.month}</span>
                <div className="flex-1 flex gap-0.5 h-4 items-center">
                  <div className="h-full rounded-sm" style={{ width: `${(m.revenue / maxRev) * 100}%`, background: 'var(--theme-brand-primary)', opacity: 0.8 }} />
                  <div className="h-full rounded-sm" style={{ width: `${(m.expense / maxRev) * 100}%`, background: 'var(--theme-brand-secondary)', opacity: 0.2 }} />
                </div>
                <span className="text-[10px] font-semibold w-14 text-right font-mono-num" style={{color:'var(--theme-text-primary)'}}>{formatCurrencyShort(m.revenue)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Drivers + Trips side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Drivers — compact list */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{color:'var(--theme-text-muted)'}}>Top tài xế</h3>
            <button onClick={() => navigate('/director/driver-kpi')} className="text-[10px] font-semibold" style={{color:'var(--theme-brand-secondary)'}}>Xem tất cả →</button>
          </div>
          <div className="space-y-1">
            {topDrivers.slice(0, 5).map((d, i) => (
              <div key={d.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${i === 0 ? 'badge-gold' : 'bg-gray-100 text-gray-400'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-semibold truncate block" style={{color:'var(--theme-text-primary)'}}>{d.name}</span>
                </div>
                <span className="text-[10px]" style={{color:'var(--theme-text-muted)'}}>{d.monthlyTrips} chuyến</span>
                <span className="text-[12px] font-bold font-mono-num shrink-0" style={{color:'var(--theme-text-primary)'}}>{formatCurrencyShort(d.monthlyRevenue)}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Recent trips — compact list */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{color:'var(--theme-text-muted)'}}>Chuyến gần đây</h3>
            <button onClick={() => navigate('/director/trips')} className="text-[10px] font-semibold" style={{color:'var(--theme-brand-secondary)'}}>Xem tất cả →</button>
          </div>
          <div className="space-y-1">
            {mockJobs.slice(0, 5).map(job => (
              <div key={job.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-semibold" style={{color:'var(--theme-text-primary)'}}>{job.containerNumber}</span>
                    <StatusBadge variant={getJobStatusBadge(job.status).variant} label={getJobStatusBadge(job.status).label} />
                  </div>
                </div>
                <span className="text-[12px] font-semibold font-mono-num shrink-0" style={{color:'var(--theme-text-primary)'}}>{formatCurrencyShort(job.revenue)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
