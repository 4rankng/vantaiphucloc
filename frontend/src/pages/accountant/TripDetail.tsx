import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '@/hooks/use-app-store'
import { apiClient } from '@/services/api'
import { InfoRow } from '@/components/shared/InfoRow'
import { ContBadge } from '@/components/shared/ContBadge'
import { formatCurrencyFull, type TripOrder, type WorkOrder } from '@/data/mockData'
import { Building2, Route, UserCircle, Wallet } from 'lucide-react'

export function TripDetail({ tripId }: { tripId: string }) {
  const { navigate } = useAppStore()
  const [trip, setTrip] = useState<TripOrder | null>(null)
  const [jobs, setJobs] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([apiClient.getTripOrders(), apiClient.getWorkOrders()])
      .then(([t, j]) => {
        if (!cancelled) {
          if (t.success) setTrip(t.data.find(t => t.id === tripId) ?? null)
          if (j.success) setJobs(j.data)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [tripId])

  if (loading) {
    return <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  if (!trip) {
    return <div className="p-4 text-center" style={{ color: 'var(--theme-text-muted)' }}>Không tìm thấy chuyến</div>
  }

  // Find matched jobs for this trip
  const matchedJobs = jobs.filter(j =>
    j.status !== 'PENDING' && j.clientName === trip.clientName && j.route === trip.route
  )

  return (
    <div className="space-y-4">
      {/* Trip info card */}
      <div className="rounded-2xl p-4 space-y-1"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>Chuyến</p>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: trip.status === 'DRAFT' ? 'var(--theme-status-warning-light)' : 'var(--theme-status-success-light)',
              color: trip.status === 'DRAFT' ? 'var(--theme-status-warning)' : 'var(--theme-status-success)',
            }}>
            {trip.status === 'DRAFT' ? 'Chờ đối soát' : 'Đã khớp'}
          </span>
        </div>
        <InfoRow icon={Building2} label="Khách hàng" value={trip.clientName} noBorder />
        <InfoRow icon={Route} label="Cung đường" value={trip.route} noBorder />
        <InfoRow icon={UserCircle} label="Tài xế" value={`${trip.driverName} · ${trip.tractorPlate}`} noBorder />
      </div>

      {/* Cong items */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--theme-text-muted)' }}>
          Công trong chuyến
        </p>
        <div className="space-y-2">
          {trip.containers.map((c, i) => (
            <div key={i} className="flex items-center justify-between rounded-2xl p-3"
              style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
              <div className="flex items-center gap-2">
                <ContBadge type={c.workType} />
                <span className="text-sm font-mono" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber || `Công ${i + 1}`}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matched jobs */}
      {matchedJobs.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--theme-text-muted)' }}>
            Số công đã match ({matchedJobs.length})
          </p>
          <div className="space-y-2">
            {matchedJobs.map(job => (
              <div key={job.id} className="rounded-2xl p-3"
                style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold font-mono" style={{ color: 'var(--theme-text-primary)' }}>{job.workOrderNumber}</p>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
                    {formatCurrencyFull(job.earning)}
                  </span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                  {job.driverName} · {job.tractorPlate}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
