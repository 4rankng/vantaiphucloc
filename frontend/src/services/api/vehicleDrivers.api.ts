import { api } from './client'
import { safeRequest, toCamel, toSnake } from '@/lib/safe-request'
import { unwrapList } from './utils'
import type { ApiResponse } from '@/data/domain'

export interface VehicleDriverRow {
  id: number
  vehicleId: number
  vehiclePlate: string
  driverId: number
  driverName: string
}

export function getVehicleDrivers(params?: { activeOnly?: boolean; vehicleId?: number; driverId?: number }): Promise<ApiResponse<VehicleDriverRow[]>> {
  return safeRequest(() => api.get('/vehicle-drivers', { params: toSnake(params) }),
    (res) => toCamel<VehicleDriverRow[]>(unwrapList(res.data)),
  )
}

export function addVehicleDriver(vehicleId: number, driverId: number, effectiveFrom?: string): Promise<ApiResponse<VehicleDriverRow>> {
  return safeRequest(() => api.post('/vehicle-drivers', {
    vehicle_id: vehicleId,
    driver_id: driverId,
    effective_from: effectiveFrom ?? new Date().toISOString().slice(0, 10),
  }))
}

export function removeVehicleDriver(id: number): Promise<ApiResponse<void>> {
  return safeRequest(() => api.delete(`/vehicle-drivers/${id}`), () => undefined as unknown as void)
}

export function createVehicle(plate: string): Promise<ApiResponse<{ id: number; plate: string }>> {
  return safeRequest(() => api.post('/vehicles', { plate }))
}
