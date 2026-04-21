import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockJobs, mockTractors, mockAlerts, formatCurrencyShort, getJobStatusBadge } from '@/data/mockData'
import { Route, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/use-mobile'

export default function DispatcherDashboard() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const active = mockJobs.filter(j => j.status === 'IN_PROGRESS')
  const planned = mockJobs.filter(j => j.status === 'PLANNED')
  const idle = mockTractors.filter(t => t.status === 'idle')
  const highAlerts = mockAlerts.filter(a => a.severity === 'high')

  return (
    <div className="space-y-6">
      {/* Status summary — read-only, spacing-led */}
      <div className="px-5 py-6 rounded-xl bg-white">
        <p className="text-sm text-gray-400 font-medium">{active.length} chuyến đang chạy · {idle.length} xe sẵn sàng</p>
        <p className="text-[22px] font-bold text-gray-900 tracking-tight mt-1 font-mono-num tabular-nums">
          {active.length + planned.length}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">chuyến cần xử lý hôm nay</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Route size={16}/>} label="Đang chạy" value={`${active.length}`} unit="chuyến" variant="success" />
        <StatCard icon={<Route size={16}/>} label="Chờ phân công" value={`${planned.length}`} unit="chuyến" variant="warning" />
        <StatCard icon={<Route size={16}/>} label="Xe sẵn sàng" value={`${idle.length}`} unit="xe" />
        <StatCard icon={<AlertTriangle size={16}/>} label="Cảnh báo" value={`${highAlerts.length}`} unit="mới" variant="danger" />
      </div>

      {/* Active trips */}
      <div className="px-5 py-5 rounded-xl bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Đang chạy</h3>
          <button onClick={() => navigate('/dispatcher/trips')} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">Quản lý chuyến →</button>
        </div>
        {isMobile ? (
          <div className="space-y-0">
            {active.map((j) => {
              const s = getJobStatusBadge(j.status)
              return (
                <div key={j.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-900">{j.id}</span>
                      <StatusBadge variant={s.variant} label={s.label} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{j.route} · {j.tractorPlate}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 font-mono-num tabular-nums shrink-0">{formatCurrencyShort(j.revenue)}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
              <th className="pb-2 pr-3 font-semibold">Mã</th><th className="pb-2 pr-3 font-semibold">Tuyến</th>
              <th className="pb-2 pr-3 font-semibold">Đầu kéo</th><th className="pb-2 pr-3 font-semibold">Tài xế</th>
              <th className="pb-2 text-right font-semibold">Cước</th>
            </tr></thead>
            <tbody>{active.map((j) => (
              <tr key={j.id} className="border-b border-gray-50 last:border-0">
                <td className="py-2.5 pr-3 text-sm font-semibold text-gray-900 font-mono-num">{j.id}</td>
                <td className="py-2.5 pr-3 text-sm text-gray-600 max-w-[200px] truncate">{j.route}</td>
                <td className="py-2.5 pr-3 text-sm text-gray-400 font-mono-num">{j.tractorPlate}</td>
                <td className="py-2.5 pr-3 text-sm text-gray-400">{j.driverName}</td>
                <td className="py-2.5 text-right text-sm font-semibold text-gray-900 font-mono-num tabular-nums">{formatCurrencyShort(j.revenue)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* Alerts — only if present */}
      {highAlerts.length > 0 && (
        <div className="px-5 py-4 rounded-xl bg-red-50 border-l-[3px] border-red-400">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-2">Cảnh báo</h3>
          <div className="space-y-2">
            {highAlerts.map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <AlertTriangle size={12} className="text-red-500 shrink-0" />
                <span className="text-sm text-gray-900 flex-1">{a.message}</span>
                <span className="text-xs text-gray-400 shrink-0">{a.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planned */}
      {planned.length > 0 && (
        <div className="px-5 py-5 rounded-xl bg-white">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Sắp chạy ({planned.length})</h3>
          <div className="space-y-0">
            {planned.map((j) => (
              <div key={j.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 font-mono-num">{j.id}</span>
                  <span className="text-sm text-gray-400">{j.route}</span>
                </div>
                <StatusBadge variant="warning" label="Chờ phân công" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
