import { api } from './client'
import { safeRequest, toCamel, toSnake } from '@/lib/safe-request'
import { unwrapList } from './utils'
import type { Vendor, ApiResponse, PaginatedResult } from '@/data/domain'

export type VendorSortBy = 'name' | 'code' | 'created_at'
export type SortOrder = 'asc' | 'desc'

export interface VendorFilters {
  search?: string
  sortBy?: VendorSortBy
  sortOrder?: SortOrder
  page?: number
  pageSize?: number
}

export function getVendors(): Promise<ApiResponse<Vendor[]>> {
  return safeRequest(() => api.get('/vendors'),
    (res) => toCamel<Vendor[]>(unwrapList(res.data?.items ?? res.data)),
  )
}

export function getVendorsPaged(filters?: VendorFilters): Promise<ApiResponse<PaginatedResult<Vendor>>> {
  return safeRequest(() => {
    const params: Record<string, string> = {}
    if (filters?.search) params.search = filters.search
    if (filters?.sortBy) params.sort_by = filters.sortBy
    if (filters?.sortOrder) params.sort_order = filters.sortOrder
    params.page = String(filters?.page ?? 1)
    params.page_size = String(filters?.pageSize ?? 100)
    return api.get('/vendors', { params })
  }, (res) => {
    const raw = res.data
    return {
      items: (raw.items ?? []).map((item: unknown) => toCamel<Vendor>(item)),
      total: raw.total ?? 0,
      page: raw.page ?? 1,
      pageSize: raw.page_size ?? 100,
      totalPages: raw.total_pages ?? 0,
    }
  })
}

export function createVendor(data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'> & { type?: 'company' | 'individual' }): Promise<ApiResponse<Vendor>> {
  return safeRequest(() => api.post('/vendors', toSnake(data)))
}

export function updateVendor(id: number, data: Partial<Vendor>): Promise<ApiResponse<Vendor>> {
  return safeRequest(() => api.put(`/vendors/${id}`, toSnake(data)))
}

export function deleteVendor(id: number, reason = 'Xoá nhà thầu'): Promise<ApiResponse<{ success: boolean }>> {
  return safeRequest(() => api.delete(`/vendors/${id}`, { data: { reason } }),
    () => ({ success: true }),
  )
}
