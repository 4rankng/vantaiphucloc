import { useEffect, useState, useMemo } from 'react'
import { apiClient } from '@/services/api'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { Plus } from 'lucide-react'
import { formatCurrencyFull, type TripOrder } from '@/data/domain'
import { useAppStore } from '@/hooks/use-app-store'

export function TripList() {
  const [trips, setTrips] = useState<TripOrder[]>([])
  const [loading, setLoading] = useState(true)
  const { navigate } = useAppStore()

  useEffect(() => {
    let cancelled = false
    apiClient.getTripOrders().then(res => {
      if (!cancelled && res.success) setTrips(res.data)
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  return (
    <div className="space-y-2">
      {trips.map(trip => (
        <button key={trip.id}
          onClick={() => navigate(`/accountant/trip/${trip.id}`)}
          className="w-full text-left rounded-2xl p-3.5 transition-all active:scale-[0.98] touch-manipulation"
          style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{trip.clientName}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: trip.status === 'DRAFT' ? 'var(--theme-status-warning-light)' : 'var(--theme-status-success-light)',
                color: trip.status === 'DRAFT' ? 'var(--theme-status-warning)' : 'var(--theme-status-success)',
              }}>
              {trip.status === 'DRAFT' ? 'Đối soát khách hàng' : 'Đã khớp'}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            {trip.driverName} · {trip.route}
          </p>
          {trip.containers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {trip.containers.map((c, i) => (
                <span key={i} className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}>
                  {c.workType}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs mt-1.5" style={{ color: 'var(--theme-text-muted)' }}>
            {new Date(trip.createdAt).toLocaleDateString('vi-VN')}
          </p>
        </button>
      ))}
      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => navigate('/accountant/create-trip')} label="Tạo chuyến" />
    </div>
  )
}
