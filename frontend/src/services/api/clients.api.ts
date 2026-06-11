import { api } from './client'
import { safeRequest, toCamel, toSnake } from '@/lib/safe-request'
import { unwrapList, unwrapPaginated } from './utils'
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

export function getClients(): Promise<ApiResponse<Client[]>> {
  return safeRequest(() => api.get('/clients', { params: { page_size: 1000 } }),
    (res) => {
      const rawList = unwrapList(res.data) as Record<string, unknown>[]
      return rawList.map(mapClient)
    },
  )
}

export function getClientsPaged(filters?: ClientFilters): Promise<ApiResponse<PaginatedResult<Client>>> {
  return safeRequest(() => {
    const params: Record<string, string> = {}
    if (filters?.search) params.search = filters.search
    if (filters?.sortBy) params.sort_by = filters.sortBy
    if (filters?.sortOrder) params.sort_order = filters.sortOrder
    params.page = String(filters?.page ?? 1)
    params.page_size = String(filters?.pageSize ?? 50)
    return api.get('/clients', { params })
  }, (res) => unwrapPaginated<Client>(res.data, (raw) => mapClient(raw as Record<string, unknown>)))
}

export function createClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & { type?: 'company' | 'individual' }): Promise<ApiResponse<Client>> {
  return safeRequest(() => api.post('/clients', { ...toSnake(data), partner_type: 'client' }),
    (res) => mapClient(res.data as Record<string, unknown>),
  )
}

export function updateClient(id: number, data: Partial<Client>): Promise<ApiResponse<Client>> {
  return safeRequest(() => api.put(`/clients/${id}`, toSnake(data)),
    (res) => mapClient(res.data as Record<string, unknown>),
  )
}

export function deleteClient(id: number, reason = 'Xoá chủ hàng'): Promise<ApiResponse<{ success: boolean }>> {
  return safeRequest(() => api.delete(`/clients/${id}`, { data: { reason } }),
    () => ({ success: true }),
  )
}
