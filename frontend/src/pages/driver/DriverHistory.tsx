import { useEffect, useState, useMemo } from 'react'
import { CheckCircle, Clock, Camera } from 'lucide-react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, type WorkOrder } from '@/data/mockData'

const STATUS_MAP: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
  PENDING:  { label: 'Chờ đơn giá', icon: Clock,       color: 'var(--theme-status-warning)', bg: 'var(--theme-status-warning-light)' },
  PRICED:   { label: 'Đã tính',     icon: CheckCircle,  color: 'var(--theme-status-success)', bg: 'var(--theme-status-success-light)' },
  APPROVED: { label: 'Đã duyệt',    icon: CheckCircle,  color: 'var(--theme-brand-primary)',  bg: 'var(--theme-brand-primary-light)' },
}

export function DriverHistory() {
  const { driver } = useDriverStore()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PRICED'>('ALL')

  useEffect(() => {
    let cancelled = false
    apiClient.getWorkOrders({ driverId: driver.id }).then(res => {
      if (!cancelled && res.success) setWorkOrders(res.data)
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [driver.id])

  const filtered = useMemo(() =>
    filter === 'ALL' ? workOrders : workOrders.filter(w => w.status === filter),
    [workOrders, filter],
  )

  const counts = useMemo(() => ({
    ALL: workOrders.length,
    PENDING: workOrders.filter(w => w.status === 'PENDING').length,
    PRICED: workOrders.filter(w => w.status === 'PRICED').length,
  }), [workOrders])

  const totalEarnings = useMemo(() =>
    filtered.reduce((sum, w) => sum + w.earning, 0),
    [filtered],
  )

  return (
    <div className="pb-6" style={{ background: 'var(--theme-bg-primary)' }}>
      {/* Filter tabs */}
      <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
        {(['ALL', 'PENDING', 'PRICED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all touch-manipulation"
            style={{
              background: filter === s ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
              color: filter === s ? 'var(--theme-text-on-brand)' : 'var(--theme-text-secondary)',
              border: `1px solid ${filter === s ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
            }}
          >
            {s === 'ALL' ? 'Tất cả' : STATUS_MAP[s].label} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Total earnings bar */}
      {totalEarnings > 0 && (
        <div className="px-4 mb-3">
          <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
            style={{ background: 'var(--theme-brand-primary-light)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>
              Tổng ({filtered.length} công)
            </span>
            <span className="text-base font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
              {formatCurrencyFull(totalEarnings)}
            </span>
          </div>
        </div>
      )}

      <div className="px-4 space-y-2">
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <Camera className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có số công nào</p>
          </div>
        ) : (
          filtered.map(wo => {
            const s = STATUS_MAP[wo.status] ?? STATUS_MAP.PENDING
            const StatusIcon = s.icon
            return (
              <div
                key={wo.id}
                className="rounded-2xl p-3.5"
                style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold font-mono" style={{ color: 'var(--theme-text-primary)' }}>
                        {wo.workOrderNumber}
                      </p>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
                      >
                        {wo.workType}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-muted)' }}>
                      {wo.clientName}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--theme-text-muted)', opacity: 0.7 }}>
                      {wo.route}
                    </p>
                  </div>
                  {wo.earning > 0 ? (
                    <p className="text-sm font-bold tabular-nums shrink-0" style={{ color: 'var(--theme-brand-primary)' }}>
                      +{formatCurrencyFull(wo.earning)}
                    </p>
                  ) : (
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-full shrink-0"
                      style={{ background: s.bg }}
                    >
                      <StatusIcon className="w-3 h-3" style={{ color: s.color }} />
                      <span className="text-[10px] font-semibold" style={{ color: s.color }}>{s.label}</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] mt-2" style={{ color: 'var(--theme-text-muted)' }}>
                  {new Date(wo.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
