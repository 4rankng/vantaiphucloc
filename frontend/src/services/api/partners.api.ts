import { api } from './client'
import { toCamel, toSnake, ok, fail, isNetworkError, unwrapList } from './utils'
import { setCache, getCache } from '@/lib/offline-db'
import type { Partner, PartnerType, ApiResponse } from '@/data/domain'

export async function getPartners(params?: { partnerType?: PartnerType }): Promise<ApiResponse<Partner[]>> {
  try {
    const res = await api.get('/partners', { params: toSnake(params ?? {}) })
    const data = toCamel<Partner[]>(unwrapList(res.data))
    await setCache('partners', data)
    return ok(data)
  } catch (err) {
    const cached = await getCache<Partner[]>('partners')
    if (isNetworkError(err) && cached) return ok(cached)
    return fail(err)
  }
}

export async function createPartner(data: Omit<Partner, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Partner>> {
  try {
    const res = await api.post('/partners', toSnake(data))
    return ok(toCamel<Partner>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updatePartner(id: number, data: Partial<Partner>): Promise<ApiResponse<Partner>> {
  try {
    const res = await api.put(`/partners/${id}`, toSnake(data))
    return ok(toCamel<Partner>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deletePartner(id: number, reason = 'Xoá đối tác'): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/partners/${id}`, { data: { reason } })
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}
