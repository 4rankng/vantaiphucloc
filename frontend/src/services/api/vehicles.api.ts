import { api } from './client'
import { toCamel, ok, fail } from './utils'
import type { ApiResponse } from '@/data/domain'

export interface Vehicle {
  id: number
  plate: string
  driverId: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export async function getVehicles(activeOnly = true): Promise<ApiResponse<Vehicle[]>> {
  try {
    const res = await api.get('/vehicles', { params: { active_only: activeOnly } })
    return ok(toCamel<Vehicle[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}
