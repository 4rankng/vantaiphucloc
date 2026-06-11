import { api } from './client'
import { safeRequest, toCamel, toSnake } from '@/lib/safe-request'
import { unwrapPaginated } from './utils'
import type { RoutePricing, PaginatedResult, ApiResponse } from '@/data/domain'

export interface RoutePricingCreatePayload {
  clientId: number
  pickupLocationId: number
  dropoffLocationId: number
  workType: string
  f20Price?: number | null
  f40Price?: number | null
  e20Price?: number | null
  e40Price?: number | null
  f20DriverSalary?: number | null
  f40DriverSalary?: number | null
  e20DriverSalary?: number | null
  e40DriverSalary?: number | null
}

export interface RoutePricingUpdatePayload {
  clientId?: number | null
  pickupLocationId?: number | null
  dropoffLocationId?: number | null
  workType?: string | null
  f20Price?: number | null
  f40Price?: number | null
  e20Price?: number | null
  e40Price?: number | null
  f20DriverSalary?: number | null
  f40DriverSalary?: number | null
  e20DriverSalary?: number | null
  e40DriverSalary?: number | null
}

export async function getRoutePricings(params?: {
  clientId?: number
  workType?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResult<RoutePricing>> {
  try {
    const res = await api.get('/route-pricings', {
      params: toSnake({
        clientId: params?.clientId,
        workType: params?.workType,
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 100,
      }),
    })
    return unwrapPaginated(res.data, (raw) => toCamel<RoutePricing>(raw))
  } catch {
    return { items: [], total: 0, page: 1, pageSize: 100, totalPages: 0 }
  }
}

export function createRoutePricing(
  data: RoutePricingCreatePayload,
): Promise<ApiResponse<RoutePricing>> {
  return safeRequest(() => api.post('/route-pricings', toSnake(data)))
}

export function updateRoutePricing(
  id: number,
  data: RoutePricingUpdatePayload,
): Promise<ApiResponse<RoutePricing>> {
  return safeRequest(() => api.put(`/route-pricings/${id}`, toSnake(data)))
}

export function deleteRoutePricing(
  id: number,
): Promise<ApiResponse<{ success: boolean }>> {
  return safeRequest(() => api.delete(`/route-pricings/${id}`), () => ({ success: true }))
}

// ── Import ────────────────────────────────────────────────────────

export interface RoutePricingImportPreviewRow {
  clientRaw: string
  clientId: number | null
  clientMatched: boolean
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
  f20DriverSalary: number | null
  f40DriverSalary: number | null
  e20DriverSalary: number | null
  e40DriverSalary: number | null
  rowIndex: number
  canCommit: boolean
}

export interface RoutePricingImportPreview {
  sheetName: string
  rows: RoutePricingImportPreviewRow[]
  warnings: string[]
  stats: {
    total: number
    matched: number
    unmatchedClient: number
    unmatchedLocation: number
    hasWorkType: number
    missingWorkType: number
  }
}

export interface RoutePricingImportCommitRow {
  clientId: number | null
  clientRaw: string | null
  pickupLocationId: number | null
  pickupRaw: string | null
  dropoffLocationId: number | null
  dropoffRaw: string | null
  workType: string | null
  f20Price?: number | null
  f40Price?: number | null
  e20Price?: number | null
  e40Price?: number | null
  f20DriverSalary?: number | null
  f40DriverSalary?: number | null
  e20DriverSalary?: number | null
  e40DriverSalary?: number | null
}

export interface RoutePricingImportResult {
  created: number
  updated: number
  skipped: number
  createdClients: number
  createdLocations: number
}

export async function previewRoutePricingImport(file: File): Promise<RoutePricingImportPreview> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/route-pricings/import-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return toCamel<RoutePricingImportPreview>(res.data)
}

export async function commitRoutePricingImport(
  rows: RoutePricingImportCommitRow[],
): Promise<RoutePricingImportResult> {
  const res = await api.post('/route-pricings/import-commit', toSnake({ rows }))
  return toCamel<RoutePricingImportResult>(res.data)
}
