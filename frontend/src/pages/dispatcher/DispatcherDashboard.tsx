import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockJobs, mockTractors, mockDrivers, mockAlerts, formatCurrencyShort, getJobStatusBadge } from '@/data/mockData'
import { Route, Truck, AlertTriangle, Clock, MapPin, CheckCircle } from 'lucide-react'
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Route size={18}/>} label="Đang chạy" value={active.length} variant="success" />
        <StatCard icon={<Clock size={18}/>} label="Lên kế hoạch" value={planned.length} variant="warning" />
        <StatCard icon={<Truck size={18}/>} label="Xe hoạt động" value={running.length} />
        <StatCard icon={<AlertTriangle size={18}/>} label="Cảnh báo" value={highAlerts.length} variant="danger" />
      </div>

      {/* Active trips */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-navy-900 font-display">Chuyến đang chạy</h3>
          <button onClick={() => navigate('/dispatcher/trips')} className="text-xs text-gold-500 font-semibold hover:underline">Quản lý chuyến →</button>
        </div>
        {isMobile ? (
          <div className="space-y-2">
            {active.map((j) => {
              const s = getJobStatusBadge(j.status)
              return (
                <div key={j.id} className="p-3 rounded-lg border border-navy-100/50 bg-emerald-50/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-navy-900 font-mono-num">{j.id}</span>
                    <StatusBadge variant="success" label={s.label} />
                  </div>
                  <p className="text-[12px] text-navy-900 font-medium">{j.route}</p>
                  <div className="flex items-center justify-between mt-2 text-[11px]">
                    <span className="text-gray-400">{j.driverName} · {j.tractorPlate}</span>
                    <span className="font-semibold text-navy-900 font-mono-num">{formatCurrencyShort(j.revenue)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-navy-100">
              <th className="pb-2 pr-3 font-semibold">Mã</th><th className="pb-2 pr-3 font-semibold">Tuyến</th>
              <th className="pb-2 pr-3 font-semibold">Đầu kéo</th><th className="pb-2 pr-3 font-semibold">Tài xế</th>
              <th className="pb-2 pr-3 font-semibold">Cont</th><th className="pb-2 text-right font-semibold">Cước</th>
            </tr></thead>
            <tbody>{active.map((j) => (
              <tr key={j.id} className="border-b border-navy-50 last:border-0">
                <td className="py-2.5 pr-3 font-semibold text-navy-900 font-mono-num">{j.id}</td>
                <td className="py-2.5 pr-3 text-navy-900 max-w-[200px] truncate">{j.route}</td>
                <td className="py-2.5 pr-3 text-gray-500 font-mono-num">{j.tractorPlate}</td>
                <td className="py-2.5 pr-3 text-gray-500">{j.driverName}</td>
                <td className="py-2.5 pr-3 text-gray-500 font-mono-num">{j.containerNumber}</td>
                <td className="py-2.5 text-right font-semibold text-navy-900 font-mono-num">{formatCurrencyShort(j.revenue)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </GlassCard>

      {/* Alerts */}
      {highAlerts.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-navy-900 font-display">⚠️ Cảnh báo</h3>
            <button onClick={() => navigate('/dispatcher/alerts')} className="text-xs text-gold-500 font-semibold hover:underline">Xem tất cả →</button>
          </div>
          <div className="space-y-2">
            {highAlerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg bg-red-50/30 border border-red-100">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-navy-900">{a.message}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{a.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Planned */}
      {planned.length > 0 && (
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-navy-900 font-display mb-3">📋 Chuyến sắp chạy</h3>
          <div className="space-y-2">
            {planned.map((j) => (
              <div key={j.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50/20 border border-amber-100">
                <div>
                  <p className="text-xs font-bold text-navy-900 font-mono-num">{j.id}</p>
                  <p className="text-[11px] text-navy-900">{j.route}</p>
                  <p className="text-[10px] text-gray-400">{j.driverName} · {j.jobDate}</p>
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
