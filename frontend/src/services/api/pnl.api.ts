/**
 * Monthly P&L (doanh thu & lãi) API.
 *
 * Revenue = Σ (BookedTrip.unit_price × container_count) over MATCHED TOs
 * Profit  = revenue − (productivity + allowance + base salary + vehicle expenses)
 */

import { api, getAccessToken } from './client'
import { toCamel, ok, fail } from './utils'
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

export async function getVehiclePnL(
  dateFrom: string,
  dateTo: string,
  vehicleId?: number,
): Promise<ApiResponse<VehiclePnLResponse>> {
  try {
    const res = await api.get('/dashboard/vehicle-pnl', {
      params: {
        date_from: dateFrom,
        date_to: dateTo,
        ...(vehicleId != null ? { vehicle_id: vehicleId } : {}),
      },
    })
    return ok(toCamel<VehiclePnLResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
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

export async function getTripDailyStats(
  dateFrom: string,
  dateTo: string,
  clientId?: number,
): Promise<ApiResponse<TripDailyStats>> {
  try {
    const res = await api.get('/dashboard/trip-daily-stats', {
      params: {
        date_from: dateFrom,
        date_to: dateTo,
        ...(clientId ? { client_id: clientId } : {}),
      },
    })
    return ok(toCamel<TripDailyStats>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export interface DirectorDashboard {
  total: number
  matched: number
  pending: number
  matchRate: number | null
  revenue: number
  avgRevenuePerTrip: number
  totalDelta: number | null
  matchedDelta: number | null
  pendingDelta: number | null
  revenueDelta: number | null
  buckets: TripDayBucket[]
  topRoutes: { name: string; count: number }[]
  topDrivers: { name: string; tripCount: number }[]
}

export async function getDirectorDashboard(
  dateFrom: string,
  dateTo: string,
): Promise<ApiResponse<DirectorDashboard>> {
  try {
    const res = await api.get('/dashboard/director', {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    return ok(toCamel<DirectorDashboard>(res.data))
  } catch (err) {
    return fail(err)
  }
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

export async function getMonthlyPnL(
  startDate: string,
  endDate: string,
): Promise<ApiResponse<MonthlyPnL>> {
  try {
    const res = await api.get('/salary/pnl', {
      params: { start_date: startDate, end_date: endDate },
    })
    return ok(toCamel<MonthlyPnL>(res.data))
  } catch (err) {
    return fail(err)
  }
}
