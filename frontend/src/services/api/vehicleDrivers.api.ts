import { api } from './client'
import { toCamel, toSnake, ok, fail, unwrapList } from './utils'
import type { ApiResponse } from '@/data/domain'

export interface VehicleDriverRow {
  id: number
  vehicleId: number
  vehiclePlate: string
  driverId: number
  driverName: string
}

export async function getVehicleDrivers(params?: { activeOnly?: boolean; vehicleId?: number; driverId?: number }): Promise<ApiResponse<VehicleDriverRow[]>> {
  try {
    const res = await api.get('/vehicle-drivers', { params: toSnake(params) })
    return ok(toCamel<VehicleDriverRow[]>(unwrapList(res.data)))
  } catch (err) {
    return fail(err)
  }
}

export async function addVehicleDriver(vehicleId: number, driverId: number, effectiveFrom?: string): Promise<ApiResponse<VehicleDriverRow>> {
  try {
    const res = await api.post('/vehicle-drivers', {
      vehicle_id: vehicleId,
      driver_id: driverId,
      effective_from: effectiveFrom ?? new Date().toISOString().slice(0, 10),
    })
    return ok(toCamel<VehicleDriverRow>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function removeVehicleDriver(id: number): Promise<ApiResponse<void>> {
  try {
    await api.delete(`/vehicle-drivers/${id}`)
    return ok(undefined as unknown as void)
  } catch (err) {
    return fail(err)
  }
}

export async function createVehicle(plate: string): Promise<ApiResponse<{ id: number; plate: string }>> {
  try {
    const res = await api.post('/vehicles', { plate })
    return ok(toCamel<{ id: number; plate: string }>(res.data))
  } catch (err) {
    return fail(err)
  }
}
