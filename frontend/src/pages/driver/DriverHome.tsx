import { useEffect, useState, useMemo } from 'react'
import { Camera, CheckCircle, Clock, Wallet } from 'lucide-react'
import { Masonry } from 'masonic'
import { useDriverStore } from '@/hooks/use-driver-store'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, type WorkOrder } from '@/data/mockData'

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  label: string
  icon: typeof CheckCircle
  color: string
  bg: string
}> = {
  PENDING:  { label: 'Chờ đơn giá', icon: Clock,       color: 'var(--theme-status-warning)',  bg: 'var(--theme-status-warning-light)' },
  PRICED:   { label: 'Đã tính',     icon: CheckCircle,  color: 'var(--theme-status-success)',  bg: 'var(--theme-status-success-light)' },
  APPROVED: { label: 'Đã duyệt',    icon: CheckCircle,  color: 'var(--theme-brand-primary)',   bg: 'var(--theme-brand-primary-light)' },
}

// ─── Masonic work-order card ──────────────────────────────────────────────────
function WorkOrderCard({ data: wo }: { data: WorkOrder }) {
  const s = STATUS_CONFIG[wo.status] ?? STATUS_CONFIG.PENDING
  const StatusIcon = s.icon
  return (
    <div
      className="rounded-2xl p-3.5"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      {/* Number + type */}
      <div className="flex items-center gap-2 mb-1.5">
        <p className="text-sm font-bold font-mono truncate" style={{ color: 'var(--theme-text-primary)' }}>
          {wo.workOrderNumber}
        </p>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
        >
          {wo.workType}
        </span>
      </div>

      {/* Client + Route */}
      <p className="text-[11px] truncate mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>
        {wo.clientName}
      </p>
      <p className="text-[10px] truncate mb-2" style={{ color: 'var(--theme-text-muted)', opacity: 0.7 }}>
        {wo.route}
      </p>

      {/* Earning or pending */}
      {wo.earning > 0 ? (
        <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
          +{formatCurrencyFull(wo.earning)}
        </p>
      ) : (
        <div
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: s.bg }}
        >
          <StatusIcon className="w-3 h-3" style={{ color: s.color }} />
          <span className="text-[10px] font-semibold" style={{ color: s.color }}>{s.label}</span>
        </div>
      )}

      {/* Date */}
      <p className="text-[10px] mt-2" style={{ color: 'var(--theme-text-muted)' }}>
        {new Date(wo.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DriverHome() {
  const { driver, navigate } = useDriverStore()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiClient.getWorkOrders({ driverId: driver.id }).then(res => {
      if (!cancelled && res.success) setWorkOrders(res.data)
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [driver.id])

  const recentOrders = useMemo(() => workOrders.slice(0, 6), [workOrders])

  // Summary
  const counts = useMemo(() => ({
    total: workOrders.length,
    pending: workOrders.filter(w => w.status === 'PENDING').length,
    priced: workOrders.filter(w => w.status === 'PRICED').length,
  }), [workOrders])

  const totalEarnings = useMemo(() =>
    workOrders.reduce((sum, w) => sum + w.earning, 0),
    [workOrders],
  )

  const thisMonthEarnings = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return workOrders
      .filter(w => w.createdAt >= monthStart)
      .reduce((sum, w) => sum + w.earning, 0)
  }, [workOrders])

  return (
    <div className="pb-8">
      {/* Earnings hero card */}
      <div className="px-4 pt-4 pb-3">
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--theme-brand-primary)',
            boxShadow: 'var(--theme-shadow-elevated)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.8 }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.8 }}>
              Thu nhập tháng này
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--theme-text-on-brand)' }}>
            {formatCurrencyFull(thisMonthEarnings)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.7 }}>
            Tổng: {formatCurrencyFull(totalEarnings)} · {counts.priced}/{counts.total} công đã tính
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        <button
          onClick={() => navigate('/driver/work-orders/new')}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] touch-manipulation"
          style={{
            background: 'var(--theme-bg-secondary)',
            color: 'var(--theme-brand-primary)',
            boxShadow: 'var(--theme-shadow-card)',
            border: '2px solid var(--theme-brand-primary)',
          }}
        >
          <Camera className="h-5 w-5" />
          Chụp số công
        </button>
      </div>

      {/* Summary strip */}
      <div className="px-4 mb-4">
        <div
          className="grid grid-cols-3 rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--theme-border-default)' }}
        >
          {[
            { label: 'Tổng công', value: counts.total, color: 'var(--theme-text-primary)' },
            { label: 'Chờ giá', value: counts.pending, color: 'var(--theme-status-warning)' },
            { label: 'Đã tính', value: counts.priced, color: 'var(--theme-status-success)' },
          ].map((item, i) => (
            <div
              key={item.label}
              className="py-3 text-center"
              style={{
                background: 'var(--theme-bg-secondary)',
                borderRight: i < 2 ? '1px solid var(--theme-border-default)' : 'none',
              }}
            >
              <p className="text-[18px] font-bold tabular-nums" style={{ color: item.color }}>{item.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent work orders — masonic grid */}
      <div className="px-4">
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--theme-text-muted)' }}>
          Số công gần đây
        </p>

        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có số công nào</p>
          </div>
        ) : (
          <Masonry
            items={recentOrders}
            columnGutter={8}
            columnWidth={160}
            maxColumnCount={2}
            render={WorkOrderCard}
            overscanBy={2}
          />
        )}
      </div>
    </div>
  )
}
