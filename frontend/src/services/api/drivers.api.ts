import { api } from './client'
import { normalizeMany, normalizeOne, toSnake, ok, fail } from './utils'
import type { Driver, ApiResponse } from '@/data/domain'

export async function getDrivers(): Promise<ApiResponse<Driver[]>> {
  try {
    const res = await api.get('/drivers')
    return ok(normalizeMany<Driver>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function createDriver(
  data: { username: string; phone: string; tractorPlate?: string; vendor?: string },
): Promise<ApiResponse<Driver>> {
  try {
    const res = await api.post('/drivers', toSnake(data))
    return ok(normalizeOne<Driver>(res.data))
  } catch (err) {
    return fail(err)
  }
}
