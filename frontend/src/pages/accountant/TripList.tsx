import { useEffect, useState } from 'react'
import { apiClient } from '@/services/api'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { TripOrderCard } from '@/components/shared/TripOrderCard'
import { Plus } from 'lucide-react'
import { type TripOrder } from '@/data/domain'
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
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {trips.map(trip => (
        <TripOrderCard
          key={trip.id}
          trip={trip}
          onClick={() => navigate(`/accountant/trip/${trip.id}`)}
        />
      ))}
      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => navigate('/accountant/create-trip')} label="Tạo chuyến" />
    </div>
  )
}
