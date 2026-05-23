import { api } from './client'
import { toCamel, toSnake, ok, fail, unwrapPaginated } from './utils'
import type { RoutePricing, PaginatedResult, ApiResponse } from '@/data/domain'

export interface RoutePricingCreatePayload {
  clientId: number
  pickupLocationId: number
  dropoffLocationId: number
  operationType: string
  f20Price?: number | null
  f40Price?: number | null
  e20Price?: number | null
  e40Price?: number | null
}

export interface RoutePricingUpdatePayload {
  clientId?: number | null
  pickupLocationId?: number | null
  dropoffLocationId?: number | null
  operationType?: string | null
  f20Price?: number | null
  f40Price?: number | null
  e20Price?: number | null
  e40Price?: number | null
}

export async function getRoutePricings(params?: {
  clientId?: number
  operationType?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResult<RoutePricing>> {
  try {
    const res = await api.get('/route-pricings', {
      params: toSnake({
        clientId: params?.clientId,
        operationType: params?.operationType,
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 100,
      }),
    })
    return unwrapPaginated(res.data, (raw) => toCamel<RoutePricing>(raw))
  } catch (err) {
    return { items: [], total: 0, page: 1, pageSize: 100, totalPages: 0 }
  }
}

export async function createRoutePricing(
  data: RoutePricingCreatePayload,
): Promise<ApiResponse<RoutePricing>> {
  try {
    const res = await api.post('/route-pricings', toSnake(data))
    return ok(toCamel<RoutePricing>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateRoutePricing(
  id: number,
  data: RoutePricingUpdatePayload,
): Promise<ApiResponse<RoutePricing>> {
  try {
    const res = await api.put(`/route-pricings/${id}`, toSnake(data))
    return ok(toCamel<RoutePricing>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteRoutePricing(
  id: number,
): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/route-pricings/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}
