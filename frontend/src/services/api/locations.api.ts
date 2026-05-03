import { api } from './client'
import { toCamel, toSnake, ok, fail, isNetworkError } from './utils'
import { setCache, getCache } from '@/lib/offline-db'
import type { Location, ApiResponse } from '@/data/domain'

export async function getLocations(): Promise<ApiResponse<Location[]>> {
  try {
    const res = await api.get('/locations/all')
    const data = toCamel<Location[]>(res.data)
    await setCache('locations', data)
    return ok(data)
  } catch (err) {
    const cached = await getCache<Location[]>('locations')
    if (isNetworkError(err) && cached) return ok(cached)
    return fail(err)
  }
}

export async function createLocation(data: { name: string }): Promise<ApiResponse<Location>> {
  try {
    const res = await api.post('/locations', toSnake(data))
    return ok(toCamel<Location>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateLocation(id: number, data: { name?: string }): Promise<ApiResponse<Location>> {
  try {
    const res = await api.put(`/locations/${id}`, toSnake(data))
    return ok(toCamel<Location>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteLocation(id: number): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/locations/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}
