import { useEffect, useState, useMemo } from 'react'
import { Camera, Clock, CheckCircle } from 'lucide-react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { apiClient } from '@/services/api'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { WorkOrder } from '@/data/mockData'

export function DriverHome() {
  const { driver, navigate } = useDriverStore()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])

  useEffect(() => {
    let cancelled = false
    apiClient.getWorkOrders({ driverId: driver.id }).then(res => {
      if (!cancelled && res.success) setWorkOrders(res.data)
    })
    return () => { cancelled = true }
  }, [driver.id])

  const recentOrders = useMemo(() => workOrders.slice(0, 5), [workOrders])

  const statusMap: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
    PENDING: { label: 'Chờ đối soát', variant: 'warning' },
    MATCHED: { label: 'Đã đối soát', variant: 'success' },
    DISPUTED: { label: 'Tranh chấp', variant: 'danger' },
  }

  return (
    <div className="pb-6">
      {/* ── CHỤP CÔNG CTA ── */}
      <div className="px-4 pt-3 pb-5" style={{ background: 'var(--theme-brand-primary)' }}>
        <p className="text-[11px] mb-0.5" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.75 }}>Xin chào,</p>
        <p className="text-[15px] font-bold mb-4" style={{ color: 'var(--theme-text-on-brand)' }}>{driver.name}</p>
        <button
          onClick={() => navigate('/driver/work-orders/new')}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] touch-manipulation"
          style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-brand-primary)', boxShadow: 'var(--theme-shadow-elevated)' }}>
          <Camera className="h-5 w-5" /> Chụp công
        </button>
      </div>

      {/* ── SỐ CÔNG GẦN ĐÂY ── */}
      <div className="px-4 mt-4">
        <SectionHeader title="Số công gần đây" />
        {recentOrders.length > 0 ? (
          <div className="space-y-2">
            {recentOrders.map(wo => {
              const s = statusMap[wo.status] ?? { label: wo.status, variant: 'default' as const }
              return (
                <div key={wo.id}
                  className="flex items-center justify-between rounded-2xl p-3"
                  style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{wo.workOrderNumber}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>{wo.workType}</span>
                      <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>·</span>
                      <span className="text-[11px] truncate" style={{ color: 'var(--theme-text-muted)' }}>{wo.clientName}</span>
                    </div>
                  </div>
                  <StatusBadge variant={s.variant}>{s.label}</StatusBadge>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có số công nào</p>
          </div>
        )}
      </div>
    </div>
  )
}
