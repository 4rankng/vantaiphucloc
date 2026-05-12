interface RouteDisplayProps {
  pickupLocation?: string | null
  dropoffLocation?: string | null
  className?: string
}

export function RouteDisplay({ pickupLocation, dropoffLocation, className = '' }: RouteDisplayProps) {
  if (pickupLocation || dropoffLocation) {
    return (
      <div className={`flex flex-col gap-0.5 ${className}`}>
        <p className="text-sm font-semibold leading-tight break-words line-clamp-2" style={{ color: 'var(--theme-text-primary)' }}>
          {pickupLocation || '—'}
        </p>
        <div className="text-xs break-words line-clamp-1" style={{ color: 'var(--theme-text-muted)' }}>
          → {dropoffLocation || '—'}
        </div>
      </div>
    )
  }
  return null
}
