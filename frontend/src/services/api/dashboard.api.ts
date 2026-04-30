import { api } from './client'
import { toCamel, ok, fail } from './utils'
import type { ApiResponse } from '@/data/domain'

// TODO: Add backend GET /notifications endpoint. For now, return empty.
export async function getNotifications(): Promise<ApiResponse<unknown[]>> {
  try {
    const res = await api.get('/dashboard/notifications')
    return ok(toCamel(res.data) as unknown[])
  } catch (err) {
    return fail(err)
  }
}

export interface DriverSalarySummary {
  driverId: number
  driverName: string
  tractorPlate: string | null
  totalJobs: number
  totalSalary: number
}

export interface DashboardSummary {
  totalRevenue: number
  totalExpense: number
  tripCount: number
  activeTrips: number
  outstandingDebt: number
  driverSalarySummary: DriverSalarySummary[]
  unmatchedWorkOrderCount: number
  pendingTripCount: number
  monthlyRevenue: { month: string; revenue: number; expense: number }[]
  alerts: unknown[]
}

/**
 * Fetches the dashboard summary from the backend SQL aggregation endpoint.
 * Falls back to client-side computation if the backend endpoint fails.
 */
export async function getDashboardSummary(): Promise<ApiResponse<DashboardSummary>> {
  try {
    const res = await api.get('/dashboard/summary')
    const data = toCamel<DashboardSummary>(res.data)
    // Fill in fields not yet in backend response
    if (!data.monthlyRevenue) data.monthlyRevenue = []
    if (!data.alerts) data.alerts = []
    return ok(data)
  } catch (err) {
    return fail(err)
  }
}
