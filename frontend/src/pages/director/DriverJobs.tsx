import { useEffect, useState, useMemo } from 'react'
import { AppTopBar } from '@/components/shared/AppTopBar'
import { apiClient } from '@/services/api'
import { formatCurrencyFull as formatCurrency } from '@/data/domain'
import type { WorkOrder, Driver } from '@/data/domain'

export function DriverJobs({ driverId, onBack }: { driverId: number; onBack: () => void }) {
  const [jobs, setJobs] = useState<WorkOrder[]>([])
  const [driver, setDriver] = useState<Driver | null>(null)

  useEffect(() => {
    let cancelled = false
    apiClient.getWorkOrders().then(res => {
      if (!cancelled && res.success) {
        setJobs(res.data.filter(j => j.driverId === driverId))
        const d = res.data.find(j => j.driverId === driverId)
        if (d) setDriver({ id: d.driverId, name: d.driverName, role: 'driver', phone: '', tractorPlate: d.tractorPlate })
      }
    })
    return () => { cancelled = true }
  }, [driverId])

  const totalEarning = useMemo(() => jobs.reduce((s, j) => s + j.earning, 0), [jobs])

  return (
    <>
      <AppTopBar variant="page" title={driver ? `${driver.name} · ${driver.tractorPlate}` : 'Tài xế'} onBack={onBack} />
      <div className="p-4 space-y-3">
        {/* Summary */}
        <div className="rounded-2xl p-3 flex items-center justify-between" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
          <div>
            <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--theme-text-muted)' }}>Tổng thu nhập</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(totalEarning)}</p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
            {jobs.length} chuyến
          </span>
        </div>

        {/* Job list */}
        {jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(job => (
          <div
            key={job.id}
            className="rounded-2xl p-3 space-y-2"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-muted)' }}>{job.id}</span>
              {job.status === 'PENDING' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                  background: 'var(--theme-status-warning-light)',
                  color: 'var(--theme-status-warning)',
                }}>
                  Chờ đối soát
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
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(job.earning)}</span>
            </div>
            <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{new Date(job.createdAt).toLocaleDateString('vi-VN')}</p>
          </div>
        ))}
      </div>
    </>
  )
}
