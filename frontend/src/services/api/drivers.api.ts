import { api } from './client'
import { toCamel, toSnake, ok, fail, unwrapList } from './utils'
import type { Driver, ApiResponse } from '@/data/domain'

export async function getDrivers(): Promise<ApiResponse<Driver[]>> {
  try {
    const res = await api.get('/drivers')
    return ok(toCamel<Driver[]>(unwrapList(res.data)))
  } catch (err) {
    return fail(err)
  }
}

export async function createDriver(
  data: { username: string; fullName?: string; phone: string },
): Promise<ApiResponse<Driver>> {
  try {
    const res = await api.post('/drivers', toSnake(data))
    return ok(toCamel<Driver>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateDriver(
  id: number,
  data: Partial<{ fullName: string; phone: string; username: string }>,
): Promise<ApiResponse<Driver>> {
  try {
    const res = await api.put(`/drivers/${id}`, toSnake(data))
    return ok(toCamel<Driver>(res.data))
  } catch (err) {
    return fail(err)
  }
}
