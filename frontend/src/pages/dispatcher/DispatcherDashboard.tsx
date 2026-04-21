import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockJobs, mockTractors, mockAlerts, formatCurrencyShort, getJobStatusBadge } from '@/data/mockData'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Route, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/use-mobile'

export default function DispatcherDashboard() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const active = mockJobs.filter(j => j.status === 'IN_PROGRESS')
  const planned = mockJobs.filter(j => j.status === 'PLANNED')
  const running = mockTractors.filter(t => t.status === 'running')
  const idle = mockTractors.filter(t => t.status === 'idle')
  const highAlerts = mockAlerts.filter(a => a.severity === 'high')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold" style={{color:'var(--theme-text-primary)'}}>Điều hành</h2>
        <span className="text-[10px] font-mono-num" style={{color:'var(--theme-text-muted)'}}>{running.length}/{mockTractors.length} xe chạy · {active.length + planned.length} chuyến</span>
      </div>

      {/* Single KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Route size={16}/>} label="Đang chạy" value={`${active.length}`} unit="chuyến" variant="success" />
        <StatCard icon={<AlertTriangle size={16}/>} label="Chờ phân công" value={`${planned.length}`} unit="chuyến" variant="warning" />
        <StatCard icon={<Route size={16}/>} label="Xe sẵn sàng" value={`${idle.length}`} unit="xe" />
        <StatCard icon={<AlertTriangle size={16}/>} label="Cảnh báo" value={`${highAlerts.length}`} unit="mới" variant="danger" />
      </div>

      {/* Active trips — ONE section */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{color:'var(--theme-text-muted)'}}>Chuyến đang chạy</h3>
          <button onClick={() => navigate('/dispatcher/trips')} className="text-[10px] font-semibold" style={{color:'var(--theme-brand-secondary)'}}>Quản lý chuyến →</button>
        </div>
        {isMobile ? (
          <div className="space-y-1.5">
            {active.map((j) => {
              const s = getJobStatusBadge(j.status)
              return (
                <div key={j.id} className="flex items-center gap-2 py-2 px-2.5 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-semibold" style={{color:'var(--theme-text-primary)'}}>{j.id}</span>
                      <StatusBadge variant={s.variant} label={s.label} />
                    </div>
                    <p className="text-[10px] mt-0.5" style={{color:'var(--theme-text-muted)'}}>{j.route} · {j.tractorPlate}</p>
                  </div>
                  <span className="text-[12px] font-semibold font-mono-num shrink-0" style={{color:'var(--theme-text-primary)'}}>{formatCurrencyShort(j.revenue)}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="text-left text-[10px] uppercase tracking-wider" style={{color:'var(--theme-text-muted)', borderBottom:'1px solid var(--theme-border-light)'}}>
              <th className="pb-2 pr-2 font-semibold">Mã</th><th className="pb-2 pr-2 font-semibold">Tuyến</th>
              <th className="pb-2 pr-2 font-semibold">Đầu kéo</th><th className="pb-2 pr-2 font-semibold">Tài xế</th>
              <th className="pb-2 text-right font-semibold">Cước</th>
            </tr></thead>
            <tbody>{active.map((j) => (
              <tr key={j.id} style={{borderBottom:'1px solid var(--theme-border-light)'}} className="last:border-0">
                <td className="py-2 pr-2 font-semibold font-mono-num" style={{color:'var(--theme-text-primary)', fontSize:'12px'}}>{j.id}</td>
                <td className="py-2 pr-2 truncate max-w-[180px]" style={{color:'var(--theme-text-primary)', fontSize:'12px'}}>{j.route}</td>
                <td className="py-2 pr-2 font-mono-num" style={{color:'var(--theme-text-muted)', fontSize:'11px'}}>{j.tractorPlate}</td>
                <td className="py-2 pr-2" style={{color:'var(--theme-text-muted)', fontSize:'11px'}}>{j.driverName}</td>
                <td className="py-2 text-right font-semibold font-mono-num" style={{color:'var(--theme-text-primary)', fontSize:'12px'}}>{formatCurrencyShort(j.revenue)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </GlassCard>

      {/* Alerts — only if any */}
      {highAlerts.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{color:'var(--theme-text-muted)'}}>Cảnh báo</h3>
          <div className="space-y-1">
            {highAlerts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{background:'#fef2f2'}}>
                <AlertTriangle size={12} style={{color:'#dc2626'}} />
                <span className="text-[11px] flex-1" style={{color:'var(--theme-text-primary)'}}>{a.message}</span>
                <span className="text-[10px]" style={{color:'var(--theme-text-muted)'}}>{a.timestamp}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Planned — compact */}
      {planned.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{color:'var(--theme-text-muted)'}}>Sắp chạy ({planned.length})</h3>
          <div className="space-y-1">
            {planned.map((j) => (
              <div key={j.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold font-mono-num" style={{color:'var(--theme-text-primary)'}}>{j.id}</span>
                  <span className="text-[11px]" style={{color:'var(--theme-text-muted)'}}>{j.route}</span>
                </div>
                <StatusBadge variant="warning" label="Chờ phân công" />
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
