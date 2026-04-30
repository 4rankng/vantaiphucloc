import { useEffect, useState, useMemo } from 'react'
import { AppTopBar } from '@/components/shared/AppTopBar'
import { apiClient } from '@/services/api'
import { formatCurrencyFull as formatCurrency } from '@/data/domain'
import type { WorkOrder, Pricing, Client } from '@/data/domain'

export function ClientJobs({ clientId, onBack }: { clientId: number; onBack: () => void }) {
  const [jobs, setJobs] = useState<WorkOrder[]>([])
  const [pricings, setPricings] = useState<Pricing[]>([])
  const [clientName, setClientName] = useState('')
  const [showPricing, setShowPricing] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiClient.getWorkOrders(),
      apiClient.getClients(),
      apiClient.getPricings({ clientId }),
    ]).then(([jRes, cRes, pRes]) => {
      if (!cancelled) {
        if (jRes.success) setJobs(jRes.data.filter(j => j.clientId === clientId))
        if (cRes.success) {
          const c = (cRes.data as Client[]).find(c => c.id === clientId)
          setClientName(c?.name ?? String(clientId))
        }
        if (pRes.success) setPricings(pRes.data)
      }
    })
    return () => { cancelled = true }
  }, [clientId])

  const totalRevenue = useMemo(() => jobs.reduce((s, j) => s + j.unitPrice, 0), [jobs])
  const totalDriverEarning = useMemo(() => jobs.reduce((s, j) => s + j.earning, 0), [jobs])
  const clientPricings = pricings

  // Count jobs per pricing combo (workType + route)
  const pricingJobCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const j of jobs) {
      const key = `${j.containers[0]?.workType ?? ''}|${j.route}`
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [jobs])

  return (
    <>
      <AppTopBar variant="page" title={clientName} onBack={onBack} />
      <div className="p-4 space-y-3 lg:max-w-[1600px] lg:mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--theme-text-muted)' }}>Doanh thu</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--theme-text-muted)' }}>Chi tài xế</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(totalDriverEarning)}</p>
          </div>
        </div>

        {/* ── Đơn giá section ── */}
        <button
          onClick={() => setShowPricing(!showPricing)}
          className="w-full rounded-2xl p-3.5 flex items-center justify-between touch-manipulation"
          style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
        >
          <span className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Bảng giá</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}>{clientPricings.length} mức giá</span>
        </button>

        {showPricing && clientPricings.length > 0 && (
          <div className="space-y-2">
            {clientPricings.map(p => {
              const jobCount = pricingJobCounts.get(`${p.workType}|${p.route}`) ?? 0
              return (
                <div
                  key={p.id}
                  className="rounded-2xl p-3 space-y-2"
                  style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
                >
                  {/* Top: type + unit price */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>{p.workType}</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(p.unitPrice)}</span>
                  </div>
                  {/* Route */}
                  <div className="flex items-start gap-1.5">
                    <span className="text-[10px] font-bold uppercase shrink-0" style={{ color: 'var(--theme-text-muted)' }}>Tuyến</span>
                    <span className="text-xs leading-relaxed" style={{ color: 'var(--theme-text-primary)' }}>{p.route}</span>
                  </div>
                  {/* Driver salary + allowance */}
                  <div className="flex gap-4">
                    <div>
                      <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Lương tài xế</span>
                      <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(p.driverSalary)}</p>
                    </div>
                    <div>
                      <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Phụ cấp</span>
                      <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(p.allowance)}</p>
                    </div>
                    <div>
                      <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Số lượng</span>
                      <p className="text-xs font-bold tabular-nums" style={{ color: jobCount > 0 ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)' }}>{jobCount} công</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Job history section ── */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>Lịch sử chuyến</p>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}>{jobs.length} chuyến</span>
        </div>

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
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>{job.driverName}</span>
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
    </>
  )
}
