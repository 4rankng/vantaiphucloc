import { api } from './client'
import { toCamel, toSnake, ok, fail } from './utils'
import type { Driver, ApiResponse } from '@/data/domain'

export async function getDrivers(): Promise<ApiResponse<Driver[]>> {
  try {
    const res = await api.get('/drivers')
    return ok(toCamel<Driver[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function createDriver(
  data: { username: string; phone: string; tractorPlate?: string; vendor?: string },
): Promise<ApiResponse<Driver>> {
  try {
    const res = await api.post('/drivers', toSnake(data))
    return ok(toCamel<Driver>(res.data))
  } catch (err) {
    return fail(err)
  }
}
