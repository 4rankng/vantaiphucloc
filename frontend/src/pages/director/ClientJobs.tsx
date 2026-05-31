import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatCurrencyFull as formatCurrency } from '@/data/domain'
import { BackButton } from '@/components/shared/navigation/BackButton'
import { MiniStatCard } from '@/components/shared/data-display/MiniStatCard'
import { useDeliveredTrips, useClients, usePricings } from '@/hooks/use-queries'

export function ClientJobs() {
  const { clientId: clientIdStr } = useParams<{ clientId: string }>()
  const clientId = Number(clientIdStr)
  const [showPricing, setShowPricing] = useState(false)

  const { data: _deliveredTrips } = useDeliveredTrips()
  const allDeliveredTrips = useMemo(() => _deliveredTrips?.items ?? [], [_deliveredTrips])
  const { data: clients = [] } = useClients()
  const { data: pricings = [] } = usePricings({ clientId })

  const jobs = useMemo(
    () => allDeliveredTrips.filter(j => j.client.id === clientId),
    [allDeliveredTrips, clientId],
  )

  const clientName = useMemo(
    () => clients.find(c => c.id === clientId)?.name ?? String(clientId),
    [clients, clientId],
  )

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [jobs],
  )

  // DeliveredTrip uses `revenue`, not `unitPrice` — older code referenced the
  // wrong field, which silently returned NaN totals.
  const totalRevenue = useMemo(() => jobs.reduce((s, j) => s + (j.revenue ?? 0), 0), [jobs])
  const totalDriverEarning = useMemo(() => jobs.reduce((s, j) => s + (j.driverSalary ?? 0), 0), [jobs])

  const pricingJobCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const j of jobs) {
      const key = `${j.workType ?? ''}|${j.pickupLocation?.name}→${j.dropoffLocation?.name}`
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [jobs])

  return (
    <div className="space-y-3 w-full">
      <BackButton />
      <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{clientName}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <MiniStatCard label="Doanh thu" value={formatCurrency(totalRevenue)} />
        <MiniStatCard label="Chi tài xế" value={formatCurrency(totalDriverEarning)} />
      </div>

      {/* Đơn giá section */}
      <button
        onClick={() => setShowPricing(!showPricing)}
        className="w-full rounded-lg p-3.5 flex items-center justify-between touch-manipulation"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
      >
        <span className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Bảng giá</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}>{pricings.length} mức giá</span>
      </button>

      {showPricing && pricings.length > 0 && (
        <div className="space-y-2">
          {pricings.map(p => {
            const route = `${p.pickupLocation.name} - ${p.dropoffLocation.name}`
            const jobCount = pricingJobCounts.get(`${p.workType}|${route}`) ?? 0
            const firstLine = p.lines[0]
            return (
              <div
                key={p.id}
                className="rounded-lg p-3 space-y-2"
                style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>{p.workType}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(firstLine?.unitPrice ?? 0)}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-[10px] font-bold uppercase shrink-0" style={{ color: 'var(--theme-text-muted)' }}>Tuyến</span>
                  <span className="text-xs leading-relaxed" style={{ color: 'var(--theme-text-primary)' }}>{route}</span>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Lương tài xế</span>
                    <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(firstLine?.driverSalary ?? 0)}</p>
                  </div>
                  <div>
                    <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Số lượng</span>
                    <p className="text-xs font-bold tabular-nums" style={{ color: jobCount > 0 ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)' }}>{jobCount} cont</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Job history */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>Lịch sử chuyến</p>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}>{jobs.length} chuyến</span>
      </div>

      {sortedJobs.map(job => (
        <div
          key={job.id}
          className="rounded-lg p-3 space-y-2"
          style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
        >
          {/* Header row — show the container number (or fallback id) as the
              identifier since DeliveredTrip has no `code` field. Vendor-only
              trips have no driver assigned; show '—' rather than crash. */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
              {job.contNumber || `#${job.id}`}
            </span>
            {!job.driver && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                background: 'var(--theme-status-warning-light)',
                color: 'var(--theme-status-warning)',
              }}>
                Chưa ghép
              </span>
            )}
          </div>
          {(job.driver?.name || job.vehiclePlate) && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                {job.driver?.name ?? '—'}
              </span>
              {job.vehiclePlate && (
                <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>• {job.vehiclePlate}</span>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {job.contNumber && (
              <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}>
                {job.contNumber} ({job.contType ?? job.workType ?? '?'})
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{job.pickupLocation?.name} → {job.dropoffLocation?.name}</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(job.revenue ?? 0)}</span>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{new Date(job.createdAt).toLocaleDateString('vi-VN')}</p>
        </div>
      ))}
    </div>
  )
}
