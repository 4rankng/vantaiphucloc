import type { WorkOrder, TripOrder } from '@/data/domain'

type RouteEntity = WorkOrder | TripOrder

export function resolveRoute(wo: RouteEntity): string {
  const from = wo.pickupLocation?.name || ''
  const to = wo.dropoffLocation?.name || ''
  return to ? `${from} → ${to}` : from
}
