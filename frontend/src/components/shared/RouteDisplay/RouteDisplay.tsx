interface RouteDisplayProps {
  route: string
  pickupLocation?: string | null
  dropoffLocation?: string | null
  className?: string
}

export function RouteDisplay({ route, pickupLocation, dropoffLocation, className = '' }: RouteDisplayProps) {
  // If we have separate pickup/dropoff locations, use them
  if (pickupLocation || dropoffLocation) {
    return (
      <div className={`flex flex-col gap-0.5 ${className}`}>
        <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          Điểm lấy: {pickupLocation || route.split(' - ')[0] || route}
        </div>
        <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          Điểm trả: {dropoffLocation || route.split(' - ')[1] || route}
        </div>
      </div>
    )
  }

  // Fallback: try to parse "Điểm A - Điểm B" format
  const parts = route.split(' - ')
  if (parts.length >= 2) {
    return (
      <div className={`flex flex-col gap-0.5 ${className}`}>
        <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          Điểm lấy: {parts[0]}
        </div>
        <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          Điểm trả: {parts[1]}
        </div>
      </div>
    )
  }

  // Last resort: just show the route on one line
  return (
    <div className={className}>
      <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{route}</span>
    </div>
  )
}
