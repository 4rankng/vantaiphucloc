import type { MonthlyPnL } from '@/services/api/pnl.api'

export { daysInMonth, pad } from './date-utils'

export function sumChiPhi(p: MonthlyPnL | null | undefined): number {
  if (!p) return 0
  return (p.totalProductivitySalary ?? 0)
    + (p.totalAllowance ?? 0)
    + (p.totalBaseSalary ?? 0)
    + (p.totalVehicleExpenses ?? 0)
    + (p.totalCpChung ?? 0)
}

export function computeDelta(current: number, prev: number): number | null {
  if (!prev || prev === 0) return null
  return Math.round(((current - prev) / Math.abs(prev)) * 100)
}

export function formatTripDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  return d && m ? `${d}/${m}` : dateStr
}

export interface VehicleGroup {
  vehicleId: number
  plate: string
  vendorId: number | null
  drivers: { id: number; driverId: number; driverName: string }[]
}

export function groupByVehicle(
  rows: { id: number; vehicleId: number; vehiclePlate: string; driverId: number; driverName: string }[],
  vehicles: { id: number; plate: string; vendorId?: number | null }[],
): VehicleGroup[] {
  const map = new Map<number, VehicleGroup>()
  for (const r of rows) {
    if (!map.has(r.vehicleId)) {
      map.set(r.vehicleId, { vehicleId: r.vehicleId, plate: r.vehiclePlate, vendorId: null, drivers: [] })
    }
    map.get(r.vehicleId)!.drivers.push({ id: r.id, driverId: r.driverId, driverName: r.driverName })
  }
  for (const v of vehicles) {
    if (!map.has(v.id)) {
      map.set(v.id, { vehicleId: v.id, plate: v.plate, vendorId: v.vendorId ?? null, drivers: [] })
    } else {
      map.get(v.id)!.vendorId = v.vendorId ?? null
    }
  }
  return [...map.values()].sort((a, b) => a.plate.localeCompare(b.plate))
}
