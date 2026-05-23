import { api } from './client'
import { toCamel, toSnake, ok, fail, isNetworkError, unwrapList, unwrapPaginated } from './utils'
import { setCache, getCache } from '@/lib/offline-db'
import type { Client, ApiResponse, PaginatedResult } from '@/data/domain'

export type ClientSortBy = 'name' | 'code' | 'created_at'
export type SortOrder = 'asc' | 'desc'

export interface ClientFilters {
  search?: string
  sortBy?: ClientSortBy
  sortOrder?: SortOrder
  page?: number
  pageSize?: number
}

function mapClient(raw: Record<string, unknown>): Client {
  const c = toCamel<Client>(raw)
  if (!c.type && (c as Record<string, unknown>).partnerType) {
    c.type = 'company'
  }
  return c
}

export async function getClients(): Promise<ApiResponse<Client[]>> {
  try {
    const res = await api.get('/clients', { params: { page_size: 1000 } })
    const rawList = unwrapList(res.data) as Record<string, unknown>[]
    const data = rawList.map(mapClient)
    await setCache('clients', data)
    return ok(data)
  } catch (err) {
    const cached = await getCache<Client[]>('clients')
    if (isNetworkError(err) && cached) return ok(cached)
    return fail(err)
  }
}

export async function getClientsPaged(filters?: ClientFilters): Promise<ApiResponse<PaginatedResult<Client>>> {
  try {
    const params: Record<string, string> = {}
    if (filters?.search) params.search = filters.search
    if (filters?.sortBy) params.sort_by = filters.sortBy
    if (filters?.sortOrder) params.sort_order = filters.sortOrder
    params.page = String(filters?.page ?? 1)
    params.page_size = String(filters?.pageSize ?? 50)
    const res = await api.get('/clients', { params })
    return ok(unwrapPaginated<Client>(res.data, (raw) => mapClient(raw as Record<string, unknown>)))
  } catch (err) {
    return fail(err)
  }
}

export async function createClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & { type?: 'company' | 'individual' }): Promise<ApiResponse<Client>> {
  try {
    const payload = { ...toSnake(data), partner_type: 'client' }
    const res = await api.post('/clients', payload)
    return ok(mapClient(res.data as Record<string, unknown>))
  } catch (err) {
    return fail(err)
  }
}

export async function updateClient(id: number, data: Partial<Client>): Promise<ApiResponse<Client>> {
  try {
    const res = await api.put(`/clients/${id}`, toSnake(data))
    return ok(mapClient(res.data as Record<string, unknown>))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteClient(id: number, reason = 'Xoá chủ hàng'): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/clients/${id}`, { data: { reason } })
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}
