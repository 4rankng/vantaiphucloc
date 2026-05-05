import { api } from './client'
import { toCamel, toSnake, ok, fail, isNetworkError, unwrapList } from './utils'
import { setCache, getCache } from '@/lib/offline-db'
import type { Route, ApiResponse } from '@/data/domain'

export interface RouteCreatePayload {
  route: string
  pickupLocationId: number
  dropoffLocationId: number
}

export interface RouteUpdatePayload {
  route?: string
  pickupLocationId?: number
  dropoffLocationId?: number
}

export async function getRoutes(): Promise<ApiResponse<Route[]>> {
  try {
    const res = await api.get('/routes')
    const data = toCamel<Route[]>(unwrapList(res.data))
    await setCache('routes', data)
    return ok(data)
  } catch (err) {
    const cached = await getCache<Route[]>('routes')
    if (isNetworkError(err) && cached) return ok(cached)
    return fail(err)
  }
}

export async function createRoute(data: RouteCreatePayload): Promise<ApiResponse<Route>> {
  try {
    const res = await api.post('/routes', toSnake(data))
    return ok(toCamel<Route>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateRoute(id: number | string, data: RouteUpdatePayload): Promise<ApiResponse<Route>> {
  try {
    const res = await api.put(`/routes/${id}`, toSnake(data))
    return ok(toCamel<Route>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteRoute(id: number | string): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/routes/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}
