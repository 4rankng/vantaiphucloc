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
        <p className="text-sm font-semibold leading-tight break-words line-clamp-2" style={{ color: 'var(--theme-text-primary)' }}>
          {pickupLocation || route.split(' - ')[0] || route}
        </p>
        <div className="text-xs break-words line-clamp-1" style={{ color: 'var(--theme-text-muted)' }}>
          → {dropoffLocation || route.split(' - ')[1] || route}
        </div>
      </div>
    )
  }

  // Fallback: try to parse "Điểm A - Điểm B" format
  const parts = route.split(' - ')
  if (parts.length >= 2) {
    return (
      <div className={`flex flex-col gap-0.5 ${className}`}>
        <p className="text-sm font-semibold leading-tight break-words line-clamp-2" style={{ color: 'var(--theme-text-primary)' }}>
          {parts[0]}
        </p>
        <div className="text-xs break-words line-clamp-1" style={{ color: 'var(--theme-text-muted)' }}>
          → {parts[1]}
        </div>
      </div>
    )
  }

  // Last resort: just show the route on one line
  return (
    <div className={className}>
      <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{route}</span>
    </div>
  )
}
