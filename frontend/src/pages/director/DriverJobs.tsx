import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { formatCurrencyFull as formatCurrency } from '@/data/domain'
import { BackButton } from '@/components/shared/BackButton'
import { useWorkOrders } from '@/hooks/use-queries'

export function DriverJobs() {
  const { driverId: driverIdStr } = useParams<{ driverId: string }>()
  const driverId = Number(driverIdStr)
  const { data: jobs = [] } = useWorkOrders({ driverId })

  const totalEarning = useMemo(() => jobs.reduce((s, j) => s + j.driverSalary, 0), [jobs])

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [jobs],
  )

  return (
    <>
      <BackButton />
      <div className="space-y-3">
        {/* Summary */}
        <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
          <div>
            <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--theme-text-muted)' }}>Tổng thu nhập</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(totalEarning)}</p>
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
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-muted)' }}>{job.code}</span>
              {job.status === 'PENDING' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                  background: 'var(--theme-status-warning-light)',
                  color: 'var(--theme-status-warning)',
                }}>
                  Chờ ghép
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {job.containers.map((c, i) => (
                <span key={i} className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}>
                  {c.containerNumber} ({c.workType})
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{job.route}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(job.driverSalary)}</span>
            </div>
            <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{new Date(job.createdAt).toLocaleDateString('vi-VN')}</p>
          </div>
        ))}
      </div>
    </>
  )
}
