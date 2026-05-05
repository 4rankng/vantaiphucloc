import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatCurrencyFull as formatCurrency } from '@/data/domain'
import { BackButton } from '@/components/shared/BackButton'
import { useWorkOrders, useClients, usePricings } from '@/hooks/use-queries'

export function ClientJobs() {
  const { clientId: clientIdStr } = useParams<{ clientId: string }>()
  const clientId = Number(clientIdStr)
  const [showPricing, setShowPricing] = useState(false)

  const { data: allWorkOrders = [] } = useWorkOrders()
  const { data: clients = [] } = useClients()
  const { data: pricings = [] } = usePricings({ clientId })

  const jobs = useMemo(
    () => allWorkOrders.filter(j => j.client.id === clientId),
    [allWorkOrders, clientId],
  )

  const clientName = useMemo(
    () => clients.find(c => c.id === clientId)?.name ?? String(clientId),
    [clients, clientId],
  )

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [jobs],
  )

  const totalRevenue = useMemo(() => jobs.reduce((s, j) => s + j.unitPrice, 0), [jobs])
  const totalDriverEarning = useMemo(() => jobs.reduce((s, j) => s + j.earning, 0), [jobs])

  const pricingJobCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const j of jobs) {
      const key = `${j.containers[0]?.workType ?? ''}|${j.route}`
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
        <div className="rounded-lg p-3" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--theme-text-muted)' }}>Doanh thu</p>
          <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-lg p-3" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--theme-text-muted)' }}>Chi tài xế</p>
          <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(totalDriverEarning)}</p>
        </div>
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
                    <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Phụ cấp</span>
                    <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(firstLine?.allowance ?? 0)}</p>
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
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-muted)' }}>{job.code}</span>
            {job.status === 'PENDING' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                background: 'var(--theme-status-warning-light)',
                color: 'var(--theme-status-warning)',
              }}>
                Chờ đối soát
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>{job.driver.name}</span>
            <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>• {job.tractorPlate}</span>
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
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(job.unitPrice)}</span>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{new Date(job.createdAt).toLocaleDateString('vi-VN')}</p>
        </div>
      ))}
    </div>
  )
}
