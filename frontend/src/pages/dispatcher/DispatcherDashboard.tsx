import { LayoutDashboard, MapPin, AlertTriangle, Truck, Users } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockJobs, mockAlerts, mockTractors, getJobStatusBadge, getContainerBadgeColor, formatCurrency } from '@/data/mockData'
import { AlertTriangle as AlertIcon } from 'lucide-react'

const sidebarItems = [
  { label: 'Tổng quan', icon: <LayoutDashboard size={20} />, path: '/dispatcher' },
  { label: 'Lịch vận chuyển', icon: <MapPin size={20} />, path: '/dispatcher/schedule' },
  { label: 'Cảnh báo', icon: <AlertTriangle size={20} />, path: '/dispatcher/alerts' },
  { label: 'Phương tiện', icon: <Truck size={20} />, path: '/dispatcher/vehicles' },
  { label: 'Khách hàng', icon: <Users size={20} />, path: '/dispatcher/clients' },
]

const mobileItems = sidebarItems

function JobStatusBadge({ status }: { status: string }) {
  const s = getJobStatusBadge(status as any)
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
}

export default function DispatcherDashboard() {
  const activeJobs = mockJobs.filter(j => j.status === 'IN_PROGRESS')
  const plannedJobs = mockJobs.filter(j => j.status === 'PLANNED')
  const completedJobs = mockJobs.filter(j => j.status === 'COMPLETED')

  return (
    <div className="flex min-h-screen bg-[hsl(220,20%,98%)]">
      <Sidebar items={sidebarItems} title="Điều hành" />
      <div className="flex-1 flex flex-col min-h-screen">
        <TopBar title="Tổng quan" />
        <main className="flex-1 p-4 lg:p-6 space-y-6 pb-24 lg:pb-6 overflow-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={<Truck size={24} />} label="Đang chạy" value={activeJobs.length} subtitle={`${mockTractors.filter(t => t.status === 'running').length} đầu kéo hoạt động`} variant="success" />
            <StatCard icon={<MapPin size={24} />} label="Lên kế hoạch" value={plannedJobs.length} subtitle="Chờ phân công" variant="warning" />
            <StatCard icon={<AlertTriangle size={24} />} label="Cảnh báo" value={mockAlerts.length} subtitle={`${mockAlerts.filter(a => a.severity === 'high').length} mức cao`} variant="danger" />
          </div>

          {/* Active jobs timeline */}
          <GlassCard className="p-5">
            <h3 className="text-base font-bold text-[#0a1f33] mb-4">Chuyến đang chạy</h3>
            <div className="space-y-4">
              {activeJobs.map((job, i) => (
                <div key={job.id} className="relative pl-8">
                  {i < activeJobs.length - 1 && <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-[hsl(220,10%,88%)]" />}
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="bg-[hsl(220,20%,98%)] rounded-lg p-3 border border-[hsl(220,10%,92%)]">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#0a2540]">{job.id}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${getContainerBadgeColor(job.trailerType)}`}>{job.trailerType}</span>
                        {job.isTwoWay && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">2 chiều</span>}
                      </div>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <p className="text-sm text-[#0a1f33] font-medium">{job.route}</p>
                    <p className="text-xs text-[hsl(220,10%,55%)] mt-0.5">{job.description}</p>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-[hsl(220,10%,55%)]">🚛 {job.tractorPlate} • 👤 {job.driverName} • Cont: {job.containerNumber}</span>
                      <span className="font-semibold text-[#0a2540]">{(job.revenue / 1000).toFixed(0)}k</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Planned jobs */}
          {plannedJobs.length > 0 && (
            <GlassCard className="p-5">
              <h3 className="text-base font-bold text-[#0a1f33] mb-4">Chờ phân công</h3>
              <div className="space-y-2">
                {plannedJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-50/50 border border-yellow-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#0a2540]">{job.id}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${getContainerBadgeColor(job.trailerType)}`}>{job.trailerType}</span>
                      </div>
                      <p className="text-sm text-[#0a1f33]">{job.route}</p>
                      <p className="text-xs text-[hsl(220,10%,55%)]">{job.tractorPlate} • {job.driverName}</p>
                    </div>
                    <div className="text-right">
                      <JobStatusBadge status={job.status} />
                      <p className="text-xs font-semibold text-[#0a2540] mt-1">{(job.revenue / 1000).toFixed(0)}k</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Alerts */}
          <GlassCard className="p-5">
            <h3 className="text-base font-bold text-[#0a1f33] mb-4">Cảnh báo gần đây</h3>
            <div className="space-y-2">
              {mockAlerts.map((alert) => (
                <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${
                  alert.severity === 'high' ? 'bg-red-50 border border-red-100' :
                  alert.severity === 'medium' ? 'bg-amber-50 border border-amber-100' :
                  'bg-gray-50 border border-gray-100'
                }`}>
                  <AlertIcon size={16} className={
                    alert.severity === 'high' ? 'text-red-500 mt-0.5 shrink-0' :
                    alert.severity === 'medium' ? 'text-amber-500 mt-0.5 shrink-0' :
                    'text-gray-400 mt-0.5 shrink-0'
                  } />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#0a1f33]">{alert.message}</p>
                    <p className="text-xs text-[hsl(220,10%,55%)] mt-0.5">{alert.timestamp}</p>
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
