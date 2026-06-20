import { api } from './client'
import { safeRequest } from '@/lib/safe-request'
import type { ApiResponse } from '@/data/domain'

export interface Vehicle {
  id: number
  plate: string
  driverId: number | null
  vendorId: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function getVehicles(activeOnly = true): Promise<ApiResponse<Vehicle[]>> {
  return safeRequest(() => api.get('/vehicles', { params: { active_only: activeOnly } }))
}

export function updateVehicle(id: number, plate: string): Promise<ApiResponse<Vehicle>> {
  return safeRequest(() => api.put(`/vehicles/${id}`, { plate }))
}

export function deleteVehicle(id: number): Promise<ApiResponse<void>> {
  return safeRequest(() => api.delete(`/vehicles/${id}`), () => undefined as unknown as void)
}
