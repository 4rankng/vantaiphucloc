import type { DeliveredTrip, BookedTrip } from '@/data/domain'

type RouteEntity = DeliveredTrip | BookedTrip

export function resolveRoute(wo: RouteEntity): string {
  const from = wo.pickupLocation?.name || ''
  const to = wo.dropoffLocation?.name || ''
  return to ? `${from} → ${to}` : from
}
