import { api } from './client'
import { normalizeMany, normalizeOne, ok, fail } from './utils'
import type { ApiResponse } from '@/data/domain'

// TODO: Add backend GET /notifications endpoint. For now, return empty.
export async function getNotifications(): Promise<ApiResponse<unknown[]>> {
  return ok([])
}

/**
 * Computes the dashboard summary client-side from work orders and trip orders.
 * TODO: Replace with backend SQL aggregation endpoint.
 */
export async function getDashboardSummary(): Promise<ApiResponse<{
  totalRevenue: number
  totalExpense: number
  tripCount: number
  activeTrips: number
  outstandingDebt: number
  monthlyRevenue: { month: string; revenue: number; expense: number }[]
  alerts: unknown[]
}>> {
  try {
    const [woRes, toRes, clientRes] = await Promise.all([
      api.get('/work-orders'),
      api.get('/trip-orders'),
      api.get('/clients'),
    ])

    const workOrders = normalizeMany<import('@/data/domain').WorkOrder>(woRes.data)
    const tripOrders = normalizeMany<import('@/data/domain').TripOrder>(toRes.data)
    const clients = normalizeMany<import('@/data/domain').Client>(clientRes.data)

    // Compute totals from trip orders (revenue) and work orders (expense proxy)
    const totalRevenue = tripOrders.reduce((sum, t) => sum + (t.revenue ?? 0), 0)
    const totalExpense = workOrders.reduce((sum, w) => sum + (w.earning ?? 0), 0)
    const outstandingDebt = clients.reduce((sum, c) => sum + (c.outstandingDebt ?? 0), 0)

    // Active trips = DRAFT or CONFIRMED trip orders
    const activeTrips = tripOrders.filter(
      t => t.status === 'DRAFT' || t.status === 'CONFIRMED',
    ).length

    return ok({
      totalRevenue,
      totalExpense,
      tripCount: tripOrders.length,
      activeTrips,
      outstandingDebt,
      monthlyRevenue: [],
      alerts: [],
    })
  } catch (err) {
    return fail(err)
  }
}
