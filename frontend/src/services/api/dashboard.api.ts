import { api } from './client'
import { safeRequest, toCamel } from '@/lib/safe-request'
import type { ApiResponse } from '@/data/domain'

export async function getNotifications(): Promise<ApiResponse<unknown[]>> {
  return safeRequest(() => api.get('/dashboard/notifications'),
    (res) => toCamel(res.data) as unknown[],
  )
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

export function getDashboardSummary(dateFrom?: string, dateTo?: string): Promise<ApiResponse<DashboardSummary>> {
  return safeRequest(() => {
    const params: Record<string, string> = {}
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    return api.get('/dashboard/summary', { params })
  }, (res) => {
    const data = toCamel<DashboardSummary>(res.data)
    if (!data.monthlyRevenue) data.monthlyRevenue = []
    if (!data.alerts) data.alerts = []
    return data
  })
}

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

export function getKpiTrends(days = 12, endDate?: string): Promise<ApiResponse<KpiTrends>> {
  return safeRequest(() => {
    const params: Record<string, string | number> = { days }
    if (endDate) params.end_date = endDate
    return api.get('/dashboard/kpi-trends', { params })
  })
}
