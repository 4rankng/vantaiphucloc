/**
 * Monthly P&L (doanh thu & lãi) API.
 *
 * Revenue = Σ (TripOrder.unit_price × container_count) over MATCHED TOs
 * Profit  = revenue − (productivity + allowance + base salary)
 */

import { api } from './client'
import { toCamel, ok, fail } from './utils'
import type { ApiResponse } from '@/data/domain'

export interface PartnerRevenueBreakdown {
  partnerId: number
  partnerName: string
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
  profit: number
  matchedTripCount: number
  partnerBreakdown: PartnerRevenueBreakdown[]
}

export interface VehicleExpenseSummary {
  xangDau: number
  suaChua: number
  khac: number
  total: number
}

export interface VehiclePnLRow {
  vehicleId: number
  plate: string
  revenue: number
  cpXe: VehicleExpenseSummary
  cpLuongSanLuong: number
  cpLuongCoBan: number
  loiNhuan: number
}

export interface VehiclePnLResponse {
  dateFrom: string
  dateTo: string
  rows: VehiclePnLRow[]
  cpChung: number
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
