import { useTripOrders } from '@/hooks/use-queries'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { TripOrderCard } from '@/components/shared/TripOrderCard'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function TripList() {
  const { data: trips = [], isLoading: loading } = useTripOrders()
  const navigate = useNavigate()

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
