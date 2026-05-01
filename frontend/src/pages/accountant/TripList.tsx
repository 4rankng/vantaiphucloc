import { useTripOrders } from '@/hooks/use-queries'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { TripOrderCard } from '@/components/shared/TripOrderCard'
import { Plus, Truck } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui'

export function TripList() {
  const { data: trips = [], isLoading: loading } = useTripOrders()
  const navigate = useNavigate()
  const location = useLocation()

  // Derive base path from current location so this page works under both
  // /accountant/trips and /director/trips
  const basePath = location.pathname.startsWith('/director') ? '/director' : '/accountant'
  const createTripPath = `${basePath}/create-trip`
  const tripDetailPath = (id: number) => `${basePath}/trip/${id}`

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
    <div className="space-y-3">
      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--theme-bg-secondary)' }}>
            <Truck className="w-8 h-8" style={{ color: 'var(--theme-text-muted)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Chưa có chuyến nào</p>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Nhấn nút bên dưới để tạo chuyến mới</p>
          </div>
          {/* Desktop shortcut — FAB is hidden on desktop */}
          <Button
            onClick={() => navigate(createTripPath)}
            className="hidden lg:flex items-center gap-2 h-10 px-5 font-semibold rounded-xl"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            <Plus className="w-4 h-4" /> Tạo chuyến
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
          {trips.map(trip => (
            <TripOrderCard
              key={trip.id}
              trip={trip}
              onClick={() => navigate(tripDetailPath(trip.id))}
            />
          ))}
        </div>
      )}
      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => navigate(createTripPath)} />
    </div>
  )
}
