import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockJobs, mockDrivers, mockMonthlyRevenue, mockTractors, mockAlerts, formatCurrencyShort, getJobStatusBadge } from '@/data/mockData'
import { TrendingUp, DollarSign, ArrowUpRight, AlertTriangle, Truck, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

type TimeRange = 'day' | 'week' | 'month'

export default function DirectorDashboard() {
  const navigate = useNavigate()
  const [range, setRange] = useState<TimeRange>('month')

  const running = mockTractors.filter(t => t.status === 'running')
  const idle = mockTractors.filter(t => t.status === 'idle')
  const maintenance = mockTractors.filter(t => t.status === 'maintenance')
  const highAlerts = mockAlerts.filter(a => a.severity === 'high')
  const topDrivers = [...mockDrivers].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
  const maxRev = Math.max(...mockMonthlyRevenue.map(m => m.revenue))
  const cur = mockMonthlyRevenue[mockMonthlyRevenue.length - 1]
  const profit = cur.revenue - cur.expense

  return (
    <div className="space-y-6">
      {/* ── Segmented control (not floating buttons) ── */}
      <SegmentedControl value={range} onChange={setRange} />

      {/* ── Revenue Hero Card — read-only, no borders, spacing-led ── */}
      <div className="px-5 py-6 rounded-xl bg-white">
        {/* Month — tertiary, muted */}
        <p className="text-sm text-gray-400 font-medium tracking-wide">{cur.month}</p>
        {/* Revenue — THE primary element */}
        <p className="text-[26px] font-bold text-gray-900 tracking-tight mt-1 font-mono-num">
          {formatCurrencyShort(cur.revenue)}
        </p>
        {/* Profit — secondary, colored, natural language */}
        <div className="flex items-center gap-1.5 mt-1">
          <TrendingUp size={14} className="text-emerald-600" />
          <span className="text-sm font-medium text-emerald-600">+{formatCurrencyShort(profit)} lợi nhuận</span>
        </div>
      </div>

      {/* ── Supporting KPI row — smaller, secondary ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<DollarSign size={16}/>} label="Chi phí" value={formatCurrencyShort(cur.expense)} unit="VNĐ"
          variant="warning" sparkline={[55, 60, 52, 58, 62, 65]} />
        <StatCard icon={<Truck size={16}/>} label="Đội xe" value={`${running.length}/${mockTractors.length}`} unit="chạy"
          subtitle={`${idle.length} rảnh · ${maintenance.length} SC`} />
        <StatCard icon={<AlertTriangle size={16}/>} label="Cảnh báo" value={`${highAlerts.length}`} unit="mới"
          variant="danger" />
      </div>

      {/* ── Revenue trend — read-only bar chart, no edit controls ── */}
      <div className="px-5 py-5 rounded-xl bg-white">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">Xu hướng 6 tháng</h3>
        <div className="space-y-3">
          {mockMonthlyRevenue.map((m) => {
            const mProfit = m.revenue - m.expense
            return (
              <div key={m.month} className="flex items-center gap-4">
                {/* Month label — tertiary, fixed width, right-aligned */}
                <span className="text-xs text-gray-400 w-12 shrink-0 text-right font-medium">{m.month}</span>
                {/* Bar — single bar showing revenue, no separate expense bar (cleaner) */}
                <div className="flex-1 h-5 bg-gray-50 rounded-sm relative overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-gray-800 transition-all duration-500"
                    style={{ width: `${(m.revenue / maxRev) * 100}%` }}
                  />
                </div>
                {/* Revenue — primary number for this row */}
                <span className="text-sm font-semibold text-gray-900 w-16 text-right font-mono-num tabular-nums shrink-0">
                  {formatCurrencyShort(m.revenue)}
                </span>
                {/* Profit — secondary, green/red, natural */}
                <span className={`text-xs font-medium w-14 text-right shrink-0 ${mProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  +{formatCurrencyShort(mProfit)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Drivers + Trips — list patterns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Drivers */}
        <div className="px-5 py-5 rounded-xl bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Top tài xế</h3>
            <button onClick={() => navigate('/director/driver-kpi')} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">Xem tất cả →</button>
          </div>
          <div className="space-y-0">
            {topDrivers.slice(0, 5).map((d, i) => (
              <div key={d.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 truncate block">{d.name}</span>
                </div>
                <span className="text-xs text-gray-400">{d.monthlyTrips} chuyến</span>
                <span className="text-sm font-bold text-gray-900 font-mono-num tabular-nums shrink-0">{formatCurrencyShort(d.monthlyRevenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent trips */}
        <div className="px-5 py-5 rounded-xl bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Chuyến gần đây</h3>
            <button onClick={() => navigate('/director/trips')} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">Xem tất cả →</button>
          </div>
          <div className="space-y-0">
            {mockJobs.slice(0, 5).map(job => (
              <div key={job.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{job.containerNumber}</span>
                    <StatusBadge variant={getJobStatusBadge(job.status).variant} label={getJobStatusBadge(job.status).label} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 font-mono-num tabular-nums shrink-0">{formatCurrencyShort(job.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Segmented Control — clean, no floating ── */
function SegmentedControl({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  const segments: { key: TimeRange; label: string }[] = [
    { key: 'day', label: 'Hôm nay' },
    { key: 'week', label: 'Tuần' },
    { key: 'month', label: 'Tháng' },
  ]
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5">
      {segments.map(s => (
        <button
          key={s.key}
          onClick={() => onChange(s.key)}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
            value === s.key
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
