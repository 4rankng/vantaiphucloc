import { api } from './client'
import { toCamel, toSnake, ok, fail, isNetworkError, unwrapPaginated } from './utils'
import { setCache, getCache } from '@/lib/offline-db'
import { offlineQueue } from '@/lib/offline-queue'
import type { DeliveredTrip, ContainerItem, ApiResponse, PaginatedResult } from '@/data/domain'

export interface SuggestedRoute {
  client: { id: number; code: string | null; name: string }
  pickupLocation: { id: number; name: string }
  dropoffLocation: { id: number; name: string }
  frequency: number
  lastUsed: string
  score: number
  source: 'frequent' | 'recent' | 'popular'
}

interface DeliveredTripFilters {
  driverId?: number
  dateFrom?: string
  dateTo?: string
  status?: DeliveredTrip['status']
  page?: number
  pageSize?: number
}

export interface DeliveredTripCreatePayload {
  containers: ContainerItem[]
  clientId: number
  pickupLocationId: number
  dropoffLocationId: number
  driverId?: number | null
  vendorId?: number | null
  vehicleExternalPlate?: string | null
  vessel?: string | null
  operationType?: string | null
  gpsLat?: number | null
  gpsLng?: number | null
}

export interface DeliveredTripUpdatePayload {
  containers?: ContainerItem[]
  clientId?: number
  pickupLocationId?: number
  dropoffLocationId?: number
  driverId?: number
  vendorId?: number | null
  vehicleExternalPlate?: string | null
  vessel?: string | null
  operationType?: string | null
  gpsLat?: number | null
  gpsLng?: number | null
  unitPrice?: number
  driverSalary?: number
  allowance?: number
  earning?: number
  status?: DeliveredTrip['status']
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
  const cacheKey = `delivered-trips:${filters?.driverId || ''}:${filters?.status || ''}:${filters?.dateFrom || ''}:${filters?.dateTo || ''}:p${filters?.page || 1}:s${filters?.pageSize || 50}`
  try {
    const params: Record<string, string> = {}
    if (filters?.driverId) params.driver_id = String(filters.driverId)
    if (filters?.dateFrom) params.date_from = filters.dateFrom
    if (filters?.dateTo) params.date_to = filters.dateTo
    if (filters?.status) params.status = filters.status
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
        containers: data.containers,
        client: { id: data.clientId, name: '', code: null },
        pickupLocation: { id: data.pickupLocationId, name: '' },
        dropoffLocation: { id: data.dropoffLocationId, name: '' },
        driver: { id: data.driverId, name: '' },
        gpsLat: data.gpsLat ?? 0,
        gpsLng: data.gpsLng ?? 0,
        gpsAddress: undefined,
        vessel: data.vessel ?? undefined,
        unitPrice: 0,
        driverSalary: 0,
        allowance: 0,
        pricingId: undefined,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
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

export async function validateContainer(containerNumber: string): Promise<ApiResponse<{ valid: boolean; error?: string }>> {
  try {
    const res = await api.get('/delivered-trips/validate-container', {
      params: { container_number: containerNumber },
    })
    return ok({ valid: res.data.valid, error: res.data.error })
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

export async function aiParsePreview(file: File): Promise<ApiResponse<TemplateParseResult>> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await api.post('/delivered-trips/ai-parse-preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return ok(toCamel<TemplateParseResult>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateContainerNumber(
  tripId: number,
  containerId: number,
  containerNumber: string,
): Promise<ApiResponse<ContainerItem>> {
  try {
    const res = await api.patch(
      `/delivered-trips/${tripId}/containers/${containerId}`,
      { container_number: containerNumber },
    )
    return ok(toCamel<ContainerItem>(res.data))
  } catch (err) {
    return fail(err)
  }
}
