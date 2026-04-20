import { GlassCard } from '@/components/shared/GlassCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockJobs, formatCurrencyFull, formatCurrencyShort, getJobStatusBadge } from '@/data/mockData'
import { FilterBar, MobileListCard } from '@/components/shared/DataList'

export default function DriverTrips() {
  const myJobs = mockJobs.filter(j => j.driverId === 'DRV-001')

  return (
    <div className="space-y-4">
      <FilterBar searchPlaceholder="Tìm chuyến..." />

      <div className="space-y-2">
        {myJobs.map((j) => {
          const s = getJobStatusBadge(j.status)
          return (
            <MobileListCard key={j.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-navy-900 font-mono-num">{j.id}</span>
                <StatusBadge variant={j.status === 'IN_PROGRESS' ? 'success' : j.status === 'COMPLETED' ? 'info' : 'warning'} label={s.label} />
              </div>
              <p className="text-sm font-semibold text-navy-900">{j.route}</p>
              <div className="mt-2 space-y-1 text-[11px] text-gray-400">
                <div className="flex justify-between">
                  <span>{j.jobDate}</span>
                  <span>Cont: {j.containerNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>{j.distanceKm} km</span>
                  <span className="font-semibold text-navy-900 font-mono-num">Cước: {formatCurrencyShort(j.driverFee)}</span>
                </div>
              </div>
              {j.status === 'COMPLETED' && (
                <div className="mt-2 pt-2 border-t border-navy-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">Doanh thu chuyến</span>
                  <span className="text-xs font-bold text-navy-900 font-mono-num">{formatCurrencyShort(j.revenue)}</span>
                </div>
              )}
            </MobileListCard>
          )
        })}
      </div>

      {myJobs.length === 0 && (
        <GlassCard className="p-8 text-center">
          <p className="text-sm text-gray-400">Chưa có chuyến nào</p>
        </GlassCard>
      )}
    </div>
  )
}
