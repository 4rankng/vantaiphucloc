import { api } from './client'
import { toCamel, toSnake, ok, fail, isNetworkError, unwrapList } from './utils'
import { setCache, getCache } from '@/lib/offline-db'
import type { Vendor, VendorSummary, ApiResponse } from '@/data/domain'

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
