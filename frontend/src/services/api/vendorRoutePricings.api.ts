import { api } from './client'
import { toCamel, toSnake, ok, fail, unwrapPaginated } from './utils'
import type { VendorRoutePricing, PaginatedResult, ApiResponse } from '@/data/domain'

export interface VendorRoutePricingCreatePayload {
  vendorId: number
  pickupLocationId: number
  dropoffLocationId: number
  workType: string
  f20Price?: number | null
  f40Price?: number | null
  e20Price?: number | null
  e40Price?: number | null
}

export interface VendorRoutePricingUpdatePayload {
  vendorId?: number | null
  pickupLocationId?: number | null
  dropoffLocationId?: number | null
  workType?: string | null
  f20Price?: number | null
  f40Price?: number | null
  e20Price?: number | null
  e40Price?: number | null
}

export async function getVendorRoutePricings(params?: {
  vendorId?: number
  workType?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResult<VendorRoutePricing>> {
  try {
    const res = await api.get('/vendor-route-pricings', {
      params: toSnake({
        vendorId: params?.vendorId,
        workType: params?.workType,
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 100,
      }),
    })
    return unwrapPaginated(res.data, (raw) => toCamel<VendorRoutePricing>(raw))
  } catch {
    return { items: [], total: 0, page: 1, pageSize: 100, totalPages: 0 }
  }
}

export async function createVendorRoutePricing(
  data: VendorRoutePricingCreatePayload,
): Promise<ApiResponse<VendorRoutePricing>> {
  try {
    const res = await api.post('/vendor-route-pricings', toSnake(data))
    return ok(toCamel<VendorRoutePricing>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateVendorRoutePricing(
  id: number,
  data: VendorRoutePricingUpdatePayload,
): Promise<ApiResponse<VendorRoutePricing>> {
  try {
    const res = await api.put(`/vendor-route-pricings/${id}`, toSnake(data))
    return ok(toCamel<VendorRoutePricing>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteVendorRoutePricing(
  id: number,
): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/vendor-route-pricings/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}

export interface VendorRoutePricingImportPreviewRow {
  vendorRaw: string
  vendorId: number | null
  vendorMatched: boolean
  pickupRaw: string
  pickupLocationId: number | null
  pickupMatched: boolean
  dropoffRaw: string
  dropoffLocationId: number | null
  dropoffMatched: boolean
  workType: string | null
  workTypeValid: boolean
  f20Price: number | null
  f40Price: number | null
  e20Price: number | null
  e40Price: number | null
  rowIndex: number
  canCommit: boolean
}

export interface VendorRoutePricingImportPreview {
  sheetName: string
  rows: VendorRoutePricingImportPreviewRow[]
  warnings: string[]
  stats: {
    total: number
    matched: number
    unmatchedVendor: number
    unmatchedLocation: number
    hasWorkType: number
    missingWorkType: number
  }
}

export interface VendorRoutePricingImportCommitRow {
  vendorId: number | null
  vendorRaw: string | null
  pickupLocationId: number | null
  pickupRaw: string | null
  dropoffLocationId: number | null
  dropoffRaw: string | null
  workType: string | null
  f20Price?: number | null
  f40Price?: number | null
  e20Price?: number | null
  e40Price?: number | null
}

export interface VendorRoutePricingImportResult {
  created: number
  updated: number
  skipped: number
  createdVendors: number
  createdLocations: number
}

export async function previewVendorRoutePricingImport(file: File): Promise<VendorRoutePricingImportPreview> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/vendor-route-pricings/import-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return toCamel<VendorRoutePricingImportPreview>(res.data)
}

export async function commitVendorRoutePricingImport(
  rows: VendorRoutePricingImportCommitRow[],
): Promise<VendorRoutePricingImportResult> {
  const res = await api.post('/vendor-route-pricings/import-commit', toSnake({ rows }))
  return toCamel<VendorRoutePricingImportResult>(res.data)
}
