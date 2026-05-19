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
  unmatchedDeliveredTripCount: number
  pendingTripCount: number
  monthlyRevenue: { month: string; revenue: number; expense: number }[]
  alerts: unknown[]
}

/**
 * Fetches the dashboard summary from the backend SQL aggregation endpoint.
 * Falls back to client-side computation if the backend endpoint fails.
 */
export async function getDashboardSummary(dateFrom?: string, dateTo?: string): Promise<ApiResponse<DashboardSummary>> {
  try {
    const params: Record<string, string> = {}
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    const res = await api.get('/dashboard/summary', { params })
    const data = toCamel<DashboardSummary>(res.data)
    // Fill in fields not yet in backend response
    if (!data.monthlyRevenue) data.monthlyRevenue = []
    if (!data.alerts) data.alerts = []
    return ok(data)
  } catch (err) {
    return fail(err)
  }
}

// ─── KPI Trends ─────────────────────────────────────────────────────────────

export interface KpiTrendDeltas {
  unmatchedDeliveredTrips: number
  pendingTrips: number
  driverSalary: number
  revenue: number
}

export interface KpiTrends {
  endDate: string
  days: number
  labels: string[]
  unmatchedDeliveredTrips: number[]
  pendingTrips: number[]
  driverSalary: number[]
  revenue: number[]
  deltas: KpiTrendDeltas
}

/**
 * Fetches per-day KPI activity time-series for accountant dashboard sparklines.
 * @param days  trailing window length (default 12, max 90)
 * @param endDate optional YYYY-MM-DD (defaults to today UTC server-side)
 */
export async function getKpiTrends(days = 12, endDate?: string): Promise<ApiResponse<KpiTrends>> {
  try {
    const params: Record<string, string | number> = { days }
    if (endDate) params.end_date = endDate
    const res = await api.get('/dashboard/kpi-trends', { params })
    return ok(toCamel<KpiTrends>(res.data))
  } catch (err) {
    return fail(err)
  }
}
