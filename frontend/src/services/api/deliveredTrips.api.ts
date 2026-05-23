import { api } from './client'
import { toCamel, toSnake, ok, fail, isNetworkError, unwrapPaginated } from './utils'
import { setCache, getCache } from '@/lib/offline-db'
import { offlineQueue } from '@/lib/offline-queue'
import type { DeliveredTrip, ApiResponse, PaginatedResult } from '@/data/domain'

export interface SuggestedRoute {
  client: { id: number; code: string | null; name: string }
  pickupLocation: { id: number; name: string }
  dropoffLocation: { id: number; name: string }
  frequency: number
  lastUsed: string
  score: number
  source: 'frequent' | 'recent' | 'popular'
}

export type DeliveredTripSortBy = 'trip_date' | 'vessel' | 'booked_trip_id' | 'revenue' | 'created_at' | 'client_code' | 'vehicle_plate' | 'pickup_name' | 'dropoff_name' | 'cont_number' | 'cont_type' | 'work_type'
export type SortOrder = 'asc' | 'desc'

interface DeliveredTripFilters {
  clientId?: number
  driverId?: number
  vendorId?: number
  dateFrom?: string
  dateTo?: string
  matched?: boolean
  search?: string
  page?: number
  pageSize?: number
  sortBy?: DeliveredTripSortBy
  sortOrder?: SortOrder
}

export interface DeliveredTripCreatePayload {
  contNumber?: string | null
  contType?: string | null
  clientId: number
  pickupLocationId: number
  dropoffLocationId: number
  driverId?: number | null
  vendorId?: number | null
  vehiclePlate?: string | null
  vessel?: string | null
  workType?: string | null
  tripDate?: string | null
}

export interface DeliveredTripUpdatePayload {
  contNumber?: string | null
  contType?: string | null
  clientId?: number
  pickupLocationId?: number
  dropoffLocationId?: number
  driverId?: number
  vendorId?: number | null
  vehiclePlate?: string | null
  vessel?: string | null
  workType?: string | null
  revenue?: number
  driverSalary?: number
  allowance?: number
}

export async function getDeliveredTrip(id: number): Promise<ApiResponse<DeliveredTrip>> {
  try {
    const res = await api.get(`/delivered-trips/${id}`)
    return ok(toCamel<DeliveredTrip>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getDeliveredTrips(filters?: DeliveredTripFilters): Promise<ApiResponse<PaginatedResult<DeliveredTrip>>> {
  const cacheKey = `delivered-trips:${filters?.clientId || ''}:${filters?.driverId || ''}:${filters?.vendorId || ''}:${filters?.matched ?? ''}:${filters?.dateFrom || ''}:${filters?.dateTo || ''}:${filters?.search || ''}:p${filters?.page || 1}:s${filters?.pageSize || 50}:sb${filters?.sortBy || ''}:so${filters?.sortOrder || ''}`
  try {
    const params: Record<string, string> = {}
    if (filters?.clientId) params.client_id = String(filters.clientId)
    if (filters?.driverId) params.driver_id = String(filters.driverId)
    if (filters?.vendorId) params.vendor_id = String(filters.vendorId)
    if (filters?.dateFrom) params.date_from = filters.dateFrom
    if (filters?.dateTo) params.date_to = filters.dateTo
    if (filters?.matched !== undefined) params.matched = String(filters.matched)
    if (filters?.search) params.search = filters.search
    if (filters?.sortBy) params.sort_by = filters.sortBy
    if (filters?.sortOrder) params.sort_order = filters.sortOrder
    params.page = String(filters?.page ?? 1)
    params.page_size = String(filters?.pageSize ?? 50)
    const res = await api.get('/delivered-trips', { params })
    const result = unwrapPaginated<DeliveredTrip>(res.data, (raw) => toCamel<DeliveredTrip>(raw))
    await setCache(cacheKey, result)
    return ok(result)
  } catch (err) {
    const cached = await getCache<PaginatedResult<DeliveredTrip>>(cacheKey)
    if (isNetworkError(err) && cached) return ok(cached)
    return fail(err)
  }
}

export async function createDeliveredTrip(
  data: DeliveredTripCreatePayload,
): Promise<ApiResponse<DeliveredTrip>> {
  const snakeBody = toSnake(data)
  try {
    const res = await api.post('/delivered-trips', snakeBody)
    const wo = toCamel<DeliveredTrip>(res.data)
    const cacheKey = `delivered-trips:${data.driverId || ''}:${data.clientId || ''}`
    const cached = await getCache<DeliveredTrip[]>(cacheKey)
    if (cached) {
      await setCache(cacheKey, [wo, ...cached])
    }
    return ok(wo)
  } catch (err) {
    if (isNetworkError(err)) {
      await offlineQueue.enqueue({
        endpoint: '/api/v1/delivered-trips',
        method: 'POST',
        body: snakeBody,
      })
      // Offline path: enqueue and return a placeholder; server will fill in
      // the canonical (nested) shape when it syncs back. We don't fabricate
      // ClientSummary/DriverSummary/LocationSummary here.
      return ok({
        id: -Date.now(),
        contNumber: data.contNumber ?? null,
        contType: data.contType ?? null,
        client: { id: data.clientId, name: '', code: null },
        pickupLocation: { id: data.pickupLocationId, name: '' },
        dropoffLocation: { id: data.dropoffLocationId, name: '' },
        driver: { id: data.driverId, name: '' },
        vessel: data.vessel ?? undefined,
        revenue: 0,
        driverSalary: 0,
        allowance: 0,
        createdAt: new Date().toISOString(),
        bookedTripId: null,
        pendingSync: true,
      } satisfies DeliveredTrip)
    }
    return fail(err)
  }
}

export interface OCRContainerResponse {
  success: boolean
  containerNumber: string | null
  error: string | null
  attemptsRemaining: number
}

export async function ocrContainer(imageDataUrl: string, containerIndex: number): Promise<OCRContainerResponse> {
  // Strip data URI prefix: "data:image/jpeg;base64," → raw base64
  const base64 = imageDataUrl.replace(/^data:[^;]+;base64,/, '')
  const res = await api.post('/delivered-trips/ocr-container', {
    image_data: base64,
    mime_type: 'image/jpeg',
    container_index: containerIndex,
  })
  return {
    success: res.data.success,
    containerNumber: res.data.container_number,
    error: res.data.error,
    attemptsRemaining: res.data.attempts_remaining,
  }
}

export async function updateDeliveredTrip(id: number, data: DeliveredTripUpdatePayload): Promise<ApiResponse<DeliveredTrip>> {
  try {
    const res = await api.put(`/delivered-trips/${id}`, toSnake(data))
    return ok(toCamel<DeliveredTrip>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function validateContainer(
  containerNumber: string,
): Promise<ApiResponse<{ valid: boolean; error?: string; suggestions?: string[] }>> {
  try {
    const res = await api.get('/delivered-trips/validate-container', {
      params: { container_number: containerNumber },
    })
    return ok({
      valid: res.data.valid,
      error: res.data.error,
      suggestions: res.data.suggestions ?? [],
    })
  } catch (err) {
    return fail(err)
  }
}

export async function exportDeliveredTripsExcel(filters?: {
  dateFrom?: string; dateTo?: string; status?: string
}): Promise<Blob> {
  const params = new URLSearchParams()
  if (filters?.dateFrom) params.append('date_from', filters.dateFrom)
  if (filters?.dateTo) params.append('date_to', filters.dateTo)
  if (filters?.status) params.append('status', filters.status)
  const res = await api.get(`/delivered-trips/export?${params.toString()}`, { responseType: 'blob' })
  return res.data
}

export async function getSuggestedRoutes(
  lat?: number | null,
  lng?: number | null,
  limit = 5,
): Promise<ApiResponse<SuggestedRoute[]>> {
  try {
    const params: Record<string, string> = { limit: String(limit) }
    if (lat != null && lng != null) {
      params.lat = String(lat)
      params.lng = String(lng)
    }
    const res = await api.get('/drivers/me/suggested-routes', { params })
    const items = (res.data?.items ?? []) as SuggestedRoute[]
    return ok(items)
  } catch (err) {
    return fail(err)
  }
}

export interface BulkImportAndMatchResult {
  totalRows: number
  created: number
  matched: number
  warnings: number
  unmatched: number
  errors: string[]
}

export async function bulkImportAndMatch(file: File, clientId?: number): Promise<ApiResponse<BulkImportAndMatchResult>> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    if (clientId) formData.append('client_id', String(clientId))

    const res = await api.post('/delivered-trips/bulk-import-and-match', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return ok(toCamel<BulkImportAndMatchResult>(res.data))
  } catch (err) {
    return fail(err)
  }
}


// ---------------------------------------------------------------------------
// Template Excel Parse
// ---------------------------------------------------------------------------

export interface DuplicateGroup {
  type: 'exact' | 'fuzzy' | 'digits'
  rowIndices: number[]
  containers: string[]
  message: string
}

export interface TemplateParseResult {
  filename: string
  sheetName: string
  totalRows: number
  columns: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[]
  duplicateGroups: DuplicateGroup[]
  warnings: string[]
}

export async function parsePreview(file: File): Promise<ApiResponse<TemplateParseResult>> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await api.post('/delivered-trips/parse-preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return ok(toCamel<TemplateParseResult>(res.data))
  } catch (err) {
    return fail(err)
  }
}
