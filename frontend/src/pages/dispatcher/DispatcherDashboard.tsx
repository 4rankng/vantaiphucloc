import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockJobs, mockTractors, mockDrivers, mockAlerts, formatCurrencyShort, getJobStatusBadge } from '@/data/mockData'
import { Route, Truck, AlertTriangle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/use-mobile'

export default function DispatcherDashboard() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const active = mockJobs.filter(j => j.status === 'IN_PROGRESS')
  const planned = mockJobs.filter(j => j.status === 'PLANNED')
  const running = mockTractors.filter(t => t.status === 'running')
  const highAlerts = mockAlerts.filter(a => a.severity === 'high')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Route size={24}/>} label="Đang chạy" value={active.length} variant="success" />
        <StatCard icon={<Clock size={24}/>} label="Lên kế hoạch" value={planned.length} variant="warning" />
        <StatCard icon={<Truck size={24}/>} label="Xe hoạt động" value={running.length} />
        <StatCard icon={<AlertTriangle size={24}/>} label="Cảnh báo" value={highAlerts.length} variant="danger" />
      </div>

      {/* Active trips */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-display">Chuyến đang chạy</h3>
          <button onClick={() => navigate('/dispatcher/trips')} className="text-xs font-semibold hover:underline" style={{color:'var(--theme-brand-secondary)'}}>Quản lý chuyến →</button>
        </div>
        {isMobile ? (
          <div className="space-y-2">
            {active.map((j) => {
              const s = getJobStatusBadge(j.status)
              return (
                <div key={j.id} className="p-4 rounded-xl" style={{background:'var(--theme-bg-tertiary)', border:'1px solid var(--theme-border-light)'}}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[var(--theme-text-primary)] font-mono-num">{j.id}</span>
                    <StatusBadge variant="success" label={s.label} />
                  </div>
                  <p className="text-[12px] text-[var(--theme-text-primary)] font-medium">{j.route}</p>
                  <div className="flex items-center justify-between mt-2 text-[11px]">
                    <span className="text-[var(--theme-text-muted)]">{j.driverName} · {j.tractorPlate}</span>
                    <span className="font-semibold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(j.revenue)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider" style={{borderBottom:'1px solid var(--theme-border-default)'}}>
              <th className="pb-2 pr-3 font-semibold">Mã</th><th className="pb-2 pr-3 font-semibold">Tuyến</th>
              <th className="pb-2 pr-3 font-semibold">Đầu kéo</th><th className="pb-2 pr-3 font-semibold">Tài xế</th>
              <th className="pb-2 pr-3 font-semibold">Cont</th><th className="pb-2 text-right font-semibold">Cước</th>
            </tr></thead>
            <tbody>{active.map((j) => (
              <tr key={j.id} style={{borderBottom:'1px solid var(--theme-border-light)'}} className="last:border-0">
                <td className="py-2.5 pr-3 font-semibold text-[var(--theme-text-primary)] font-mono-num">{j.id}</td>
                <td className="py-2.5 pr-3 text-[var(--theme-text-primary)] max-w-[200px] truncate">{j.route}</td>
                <td className="py-2.5 pr-3 text-[var(--theme-text-muted)] font-mono-num">{j.tractorPlate}</td>
                <td className="py-2.5 pr-3 text-[var(--theme-text-muted)]">{j.driverName}</td>
                <td className="py-2.5 pr-3 text-[var(--theme-text-muted)] font-mono-num">{j.containerNumber}</td>
                <td className="py-2.5 text-right font-semibold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(j.revenue)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </GlassCard>

      {/* Alerts */}
      {highAlerts.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-display">⚠️ Cảnh báo</h3>
            <button onClick={() => navigate('/dispatcher/alerts')} className="text-xs font-semibold hover:underline" style={{color:'var(--theme-brand-secondary)'}}>Xem tất cả →</button>
          </div>
          <div className="space-y-2">
            {highAlerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl" style={{background:'var(--theme-status-error-light)', border:'1px solid var(--theme-status-error)'}}>
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-[var(--theme-text-primary)]">{a.message}</p>
                  <p className="text-[10px] text-[var(--theme-text-muted)] mt-0.5">{a.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Planned */}
      {planned.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-display mb-4">📋 Chuyến sắp chạy</h3>
          <div className="space-y-2">
            {planned.map((j) => (
              <div key={j.id} className="flex items-center justify-between p-4 rounded-xl" style={{background:'var(--theme-status-warning-light)', border:'1px solid var(--theme-border-light)'}}>
                <div>
                  <p className="text-xs font-bold text-[var(--theme-text-primary)] font-mono-num">{j.id}</p>
                  <p className="text-[11px] text-[var(--theme-text-primary)]">{j.route}</p>
                  <p className="text-[10px] text-[var(--theme-text-muted)]">{j.driverName} · {j.jobDate}</p>
                </div>
                <StatusBadge variant="warning" label="Lên kế hoạch" />
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
