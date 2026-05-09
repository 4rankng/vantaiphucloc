import type { WorkOrder, TripOrder } from '@/data/domain'

function splitRouteParts(route: string): string[] {
  if (route.includes('→')) return route.split(/\s*→\s*/).map(s => s.trim()).filter(Boolean)
  if (route.includes(' - ')) return route.split(' - ').map(s => s.trim()).filter(Boolean)
  return [route]
}

export function resolveRoute(wo: WorkOrder | TripOrder): string {
  const parts = splitRouteParts(wo.route)
  const from = wo.pickupLocation?.name || parts[0] || wo.route
  const to = wo.dropoffLocation?.name || parts[1] || null
  return to ? `${from} → ${to}` : from
}
