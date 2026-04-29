import { api } from './client'
import { normalizeMany, normalizeOne, toSnake, ok, fail } from './utils'
import type { Pricing, ApiResponse, WorkType } from '@/data/domain'

export async function getPricings(
  filters?: { clientId?: string; workType?: WorkType; route?: string },
): Promise<ApiResponse<Pricing[]>> {
  try {
    const params: Record<string, string> = {}
    if (filters?.clientId) params.client_id = filters.clientId
    if (filters?.workType) params.work_type = filters.workType
    if (filters?.route) params.route = filters.route
    const res = await api.get('/pricings', { params })
    return ok(normalizeMany<Pricing>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function createPricing(
  data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ApiResponse<Pricing>> {
  try {
    const res = await api.post('/pricings', toSnake(data))
    return ok(normalizeOne<Pricing>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updatePricing(id: string, data: Partial<Pricing>): Promise<ApiResponse<Pricing>> {
  try {
    const res = await api.put(`/pricings/${id}`, toSnake(data))
    return ok(normalizeOne<Pricing>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deletePricing(id: string): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/pricings/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}
