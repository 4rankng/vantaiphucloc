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

export async function addVehicleDriver(vehicleId: number, driverId: number): Promise<ApiResponse<VehicleDriverRow>> {
  try {
    const res = await api.post('/vehicle-drivers', { vehicle_id: vehicleId, driver_id: driverId })
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

export async function createVehicle(plate: string, vehicleType?: string): Promise<ApiResponse<{ id: number; plate: string; vehicleType?: string | null }>> {
  try {
    const res = await api.post('/vehicles', { plate, vehicle_type: vehicleType ?? null })
    return ok(toCamel<{ id: number; plate: string; vehicleType?: string | null }>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateVehicle(vehicleId: number, data: { vehicleType?: string | null }): Promise<ApiResponse<{ id: number; plate: string; vehicleType?: string | null }>> {
  try {
    const res = await api.patch(`/vehicles/${vehicleId}`, { vehicle_type: data.vehicleType })
    return ok(toCamel<{ id: number; plate: string; vehicleType?: string | null }>(res.data))
  } catch (err) {
    return fail(err)
  }
}
