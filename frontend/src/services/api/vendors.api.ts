import { api } from './client'
import { toCamel, toSnake, ok, fail, isNetworkError, unwrapList } from './utils'
import { setCache, getCache } from '@/lib/offline-db'
import type { Vendor, VendorSummary, ApiResponse, PaginatedResult } from '@/data/domain'

export type VendorSortBy = 'name' | 'code' | 'created_at'
export type SortOrder = 'asc' | 'desc'

export interface VendorFilters {
  search?: string
  sortBy?: VendorSortBy
  sortOrder?: SortOrder
  page?: number
  pageSize?: number
}

export async function getVendors(): Promise<ApiResponse<Vendor[]>> {
  try {
    const res = await api.get('/vendors')
    const data = toCamel<Vendor[]>(unwrapList(res.data?.items ?? res.data))
    await setCache('vendors', data)
    return ok(data)
  } catch (err) {
    const cached = await getCache<Vendor[]>('vendors')
    if (isNetworkError(err) && cached) return ok(cached)
    return fail(err)
  }
}

export async function getVendorsPaged(filters?: VendorFilters): Promise<ApiResponse<PaginatedResult<Vendor>>> {
  try {
    const params: Record<string, string> = {}
    if (filters?.search) params.search = filters.search
    if (filters?.sortBy) params.sort_by = filters.sortBy
    if (filters?.sortOrder) params.sort_order = filters.sortOrder
    params.page = String(filters?.page ?? 1)
    params.page_size = String(filters?.pageSize ?? 100)
    const res = await api.get('/vendors', { params })
    const raw = res.data
    return ok({
      items: (raw.items ?? []).map((item: unknown) => toCamel<Vendor>(item)),
      total: raw.total ?? 0,
      page: raw.page ?? 1,
      pageSize: raw.page_size ?? 100,
      totalPages: raw.total_pages ?? 0,
    })
  } catch (err) {
    return fail(err)
  }
}

export async function createVendor(data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'> & { type?: 'company' | 'individual' }): Promise<ApiResponse<Vendor>> {
  try {
    const res = await api.post('/vendors', toSnake(data))
    return ok(toCamel<Vendor>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateVendor(id: number, data: Partial<Vendor>): Promise<ApiResponse<Vendor>> {
  try {
    const res = await api.put(`/vendors/${id}`, toSnake(data))
    return ok(toCamel<Vendor>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteVendor(id: number, reason = 'Xoá nhà thầu'): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/vendors/${id}`, { data: { reason } })
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}

export async function getVendorSummary(vendorId: number, params?: { dateFrom?: string; dateTo?: string }): Promise<ApiResponse<VendorSummary>> {
  try {
    const res = await api.get(`/vendor-reconciliation/vendors/${vendorId}/summary`, { params: toSnake(params ?? {}) })
    return ok(toCamel<VendorSummary>(res.data))
  } catch (err) {
    return fail(err)
  }
}
