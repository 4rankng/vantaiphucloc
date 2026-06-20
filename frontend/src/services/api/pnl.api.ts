/**
 * Monthly P&L (doanh thu & lãi) API.
 *
 * Revenue = Σ (BookedTrip.unit_price × container_count) over MATCHED TOs
 * Profit  = revenue − (productivity + allowance + base salary + vehicle expenses)
 */

import { api, getAccessToken } from './client'
import { safeRequest } from '@/lib/safe-request'
import type { ApiResponse } from '@/data/domain'

export interface ClientRevenueBreakdown {
  clientId: number
  clientName: string
  matchedTripCount: number
  revenue: number
}

export interface MonthlyPnL {
  startDate: string
  endDate: string
  revenue: number
  totalProductivitySalary: number
  totalAllowance: number
  totalBaseSalary: number
  totalVehicleExpenses: number
  totalVendorCost: number
  profit: number
  matchedTripCount: number
  clientBreakdown: ClientRevenueBreakdown[]
}

export interface VehicleExpenseSummary {
  xangDau: number
  suaChua: number
  tienLuat: number
  khac: number
  total: number
}

export interface VehiclePnLRow {
  vehicleId: number
  plate: string
  isVendor: boolean
  vendorName: string | null
  revenue: number
  cpXe: VehicleExpenseSummary
  cpLuongSanLuong: number
  cpLuongCoBan: number
  cpVendor: number
  loiNhuan: number
}

export interface VehiclePnLResponse {
  dateFrom: string
  dateTo: string
  rows: VehiclePnLRow[]
  totalRevenue: number
  totalProfit: number
}

export function getVehiclePnL(
  dateFrom: string,
  dateTo: string,
  vehicleId?: number,
): Promise<ApiResponse<VehiclePnLResponse>> {
  return safeRequest(() => api.get('/dashboard/vehicle-pnl', {
    params: {
      date_from: dateFrom,
      date_to: dateTo,
      ...(vehicleId != null ? { vehicle_id: vehicleId } : {}),
    },
  }))
}

export interface TripDayBucket {
  day: number
  date: string
  matched: number
  pending: number
}

export interface TripDailyStats {
  dateFrom: string
  dateTo: string
  total: number
  matched: number
  pending: number
  internalCount: number
  vendorCount: number
  totalRevenue: number
  matchRate: number | null
  buckets: TripDayBucket[]
}

export function getTripDailyStats(
  dateFrom: string,
  dateTo: string,
  clientId?: number,
  driverId?: number,
  matched?: boolean,
): Promise<ApiResponse<TripDailyStats>> {
  return safeRequest(() => api.get('/dashboard/trip-daily-stats', {
    params: {
      date_from: dateFrom,
      date_to: dateTo,
      ...(clientId ? { client_id: clientId } : {}),
      ...(driverId ? { driver_id: driverId } : {}),
      ...(matched !== undefined ? { matched } : {}),
    },
  }))
}

export interface VehiclePnLGroup {
  rows: VehiclePnLRow[]
  totalRevenue: number
  totalCost: number
  totalProfit: number
  tripCount: number
}

export interface DirectorDashboard {
  total: number
  matched: number
  pending: number
  matchRate: number | null
  revenue: number
  avgRevenuePerTrip: number
  totalCost: number
  profit: number
  totalDelta: number | null
  matchedDelta: number | null
  pendingDelta: number | null
  revenueDelta: number | null
  costDelta: number | null
  profitDelta: number | null
  buckets: TripDayBucket[]
  topRoutes: { name: string; count: number }[]
  topDrivers: { name: string; tripCount: number; plate: string }[]
  ownFleetPnl: VehiclePnLGroup
  vendorPnl: VehiclePnLGroup
}

export interface DirectorDashboardDrilldownVehicle {
  vehiclePlate: string
  tripCount: number
  matched: number
  pending: number
  revenue: number
  cost: number
  profit: number
}

export interface DirectorDashboardDrilldownClient {
  clientId: number
  clientName: string
  tripCount: number
  matched: number
  pending: number
  revenue: number
  cost: number
  profit: number
  vehicles: DirectorDashboardDrilldownVehicle[]
}

export interface DirectorDashboardDrilldown {
  dateFrom: string
  dateTo: string
  totals: {
    total: number
    matched: number
    pending: number
    revenue: number
    cost: number
    profit: number
  }
  clients: DirectorDashboardDrilldownClient[]
}

export function getDirectorDashboard(
  dateFrom: string,
  dateTo: string,
): Promise<ApiResponse<DirectorDashboard>> {
  return safeRequest(() => api.get('/dashboard/director', {
    params: { date_from: dateFrom, date_to: dateTo },
  }))
}

export function getDirectorDashboardDrilldown(
  dateFrom: string,
  dateTo: string,
): Promise<ApiResponse<DirectorDashboardDrilldown>> {
  return safeRequest(() => api.get('/dashboard/director/drilldown', {
    params: { date_from: dateFrom, date_to: dateTo },
  }))
}

/**
 * Download the vehicle P&L report as an Excel file.
 * Uses a native fetch so we get a Blob back; triggers browser download.
 */
export async function exportVehiclePnL(dateFrom: string, dateTo: string): Promise<void> {
  const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'
  const token = getAccessToken()
  const url = `${API_BASE}/dashboard/vehicle-pnl/export?date_from=${dateFrom}&date_to=${dateTo}`

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    throw new Error(`Export thất bại (${res.status})`)
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = `PnL_${dateFrom}_to_${dateTo}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

export function getMonthlyPnL(
  startDate: string,
  endDate: string,
): Promise<ApiResponse<MonthlyPnL>> {
  return safeRequest(() => api.get('/salary/pnl', {
    params: { start_date: startDate, end_date: endDate },
  }))
}
