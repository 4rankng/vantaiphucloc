import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatCurrencyFull as formatCurrency } from '@/data/domain'
import { useDeliveredTrips, useDrivers } from '@/hooks/use-queries'

export function DriverJobs() {
  const navigate = useNavigate()
  const { driverId: driverIdStr } = useParams<{ driverId: string }>()
  const driverId = Number(driverIdStr)
  const { data } = useDeliveredTrips({ driverId })
  const { data: drivers = [] } = useDrivers()
  const jobs = useMemo(() => data?.items ?? [], [data])

  const totalEarning = useMemo(() => jobs.reduce((s, j) => s + (j.driverSalary ?? 0), 0), [jobs])

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [jobs],
  )

  const driver = drivers.find(d => d.id === driverId)
  const driverName = driver?.fullName || driver?.username || `Lái xe #${driverId}`

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => navigate(-1)}
          aria-label="Quay lại"
          className="inline-flex items-center gap-1 text-sm font-medium shrink-0"
          style={{ color: 'var(--theme-text-secondary)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold truncate" style={{ color: 'var(--theme-text-primary)', letterSpacing: '-0.01em' }}>
          {driverName}
        </h1>
      </div>
      {/* Summary */}
        <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
          <div>
            <p className="type-overline" style={{ color: 'var(--theme-text-muted)' }}>Tổng thu nhập</p>
            <p className="type-display tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(totalEarning)}</p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
            {jobs.length} chuyến
          </span>
        </div>

        {/* Job list */}
        {sortedJobs.map(job => (
          <div
            key={job.id}
            className="rounded-lg p-3 space-y-2"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
          >
            {/* Header — DeliveredTrip has no `code` or `status`. Use the
                container number (or fallback id) as identifier; show client
                name on the right. */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
                {job.contNumber || `#${job.id}`}
              </span>
              <span className="text-[10px] font-medium truncate" style={{ color: 'var(--theme-text-muted)' }}>
                {job.client?.name ?? ''}
              </span>
            </div>
            {job.contNumber && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}>
                  {job.contNumber} ({job.contType ?? job.workType ?? '?'})
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{job.pickupLocation?.name} → {job.dropoffLocation?.name}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(job.driverSalary)}</span>
            </div>
            <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{new Date(job.createdAt).toLocaleDateString('vi-VN')}</p>
          </div>
        ))}
    </div>
  )
}
