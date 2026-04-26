import { useEffect, useState, useMemo } from 'react'
import { AppTopBar } from '@/components/shared/AppTopBar'
import { apiClient } from '@/services/api'
import { formatCurrency } from '@/data/mockData'
import type { WorkOrder, RoutePrice, Client } from '@/data/mockData'

export function ClientJobs({ clientId, onBack }: { clientId: string; onBack: () => void }) {
  const [jobs, setJobs] = useState<WorkOrder[]>([])
  const [pricings, setPricings] = useState<RoutePrice[]>([])
  const [clientName, setClientName] = useState('')
  const [showPricing, setShowPricing] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiClient.getWorkOrders(),
      apiClient.getClients(),
      apiClient.getRoutes(),
    ]).then(([jRes, cRes, rRes]) => {
      if (!cancelled) {
        if (jRes.success) setJobs(jRes.data.filter(j => j.clientId === clientId))
        if (cRes.success) {
          const c = (cRes.data as Client[]).find(c => c.id === clientId)
          setClientName(c?.name ?? clientId)
        }
        if (rRes.success) setPricings((rRes.data as RoutePrice[]).filter(p => p.clientId === clientId))
      }
    })
    return () => { cancelled = true }
  }, [clientId])

  const totalRevenue = useMemo(() => jobs.reduce((s, j) => s + j.unitPrice, 0), [jobs])
  const clientPricings = useMemo(() => pricings.filter(p => p.clientId === clientId), [pricings, clientId])

  return (
    <>
      <AppTopBar variant="page" title={clientName} onBack={onBack} />
      <div className="p-4 space-y-3">
        {/* Summary */}
        <div className="rounded-2xl p-3 flex items-center justify-between" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
          <div>
            <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--theme-text-muted)' }}>Doanh thu</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(totalRevenue)}</p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
            {jobs.length} chuyến
          </span>
        </div>

        {/* Pricing table toggle */}
        <button
          onClick={() => setShowPricing(!showPricing)}
          className="w-full rounded-2xl p-3 flex items-center justify-between touch-manipulation"
          style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
        >
          <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Bảng đơn giá ({clientPricings.length})</span>
          <span className="text-xs font-medium" style={{ color: 'var(--theme-brand-primary)' }}>{showPricing ? 'Ẩn' : 'Xem'}</span>
        </button>

        {showPricing && clientPricings.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
            {/* Header */}
            <div className="grid grid-cols-4 px-3 py-2" style={{ background: 'var(--theme-bg-tertiary)' }}>
              <span className="text-[10px] font-bold" style={{ color: 'var(--theme-text-muted)' }}>Loại</span>
              <span className="text-[10px] font-bold col-span-2" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</span>
              <span className="text-[10px] font-bold text-right" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá</span>
            </div>
            {clientPricings.map((p, i) => (
              <div
                key={i}
                className="grid grid-cols-4 px-3 py-2.5 items-center"
                style={{ borderBottom: i < clientPricings.length - 1 ? '1px solid var(--theme-border-default)' : 'none' }}
              >
                <span className="text-xs font-bold" style={{ color: 'var(--theme-brand-primary)' }}>{p.workType}</span>
                <span className="text-xs col-span-2 truncate" style={{ color: 'var(--theme-text-primary)' }}>{p.route}</span>
                <span className="text-xs font-bold tabular-nums text-right" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(p.unitPrice)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Job list */}
        {jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(job => (
          <div
            key={job.id}
            className="rounded-2xl p-3 space-y-2"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-muted)' }}>{job.id}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                background: job.status === 'PRICED' ? 'var(--theme-brand-primary-light)' : 'var(--theme-status-warning-light)',
                color: job.status === 'PRICED' ? 'var(--theme-brand-primary)' : 'var(--theme-status-warning)',
              }}>
                {job.status === 'PRICED' ? 'Đã tính giá' : 'Chờ đơn giá'}
              </span>
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
