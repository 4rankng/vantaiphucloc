import { api } from './client'
import { safeRequest, toCamel, toSnake } from '@/lib/safe-request'
import { unwrapPaginated } from './utils'
import type { DeliveredTrip, ApiResponse, PaginatedResult } from '@/data/domain'

/** Strip "data:image/...;base64," prefix from a data-URI to get raw base64. */
function stripBase64Prefix(dataUrl: string): string {
  return dataUrl.replace(/^data:[^;]+;base64,/, '')
}

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
  /** Raw OCR value before correction; serialized to original_cont_number. */
  originalContNumber?: string | null
  contPhotoUrl?: string | null
  photoDataUrl?: string | null
  clientId: number
  pickupLocationId: number
  dropoffLocationId: number
  driverId?: number | null
  vendorId?: number | null
  vehiclePlate?: string | null
  vessel?: string | null
  workType?: string | null
  tripDate?: string | null
  note?: string | null
}

export interface DeliveredTripUpdatePayload {
  contNumber?: string | null
  contType?: string | null
  contPhotoUrl?: string | null
  clientId?: number
  pickupLocationId?: number
  dropoffLocationId?: number
  driverId?: number
  vendorId?: number | null
  vehiclePlate?: string | null
  vessel?: string | null
  workType?: string | null
  tripDate?: string | null
  revenue?: number
  driverSalary?: number
  note?: string | null
}

export function getDeliveredTrip(id: number): Promise<ApiResponse<DeliveredTrip>> {
  return safeRequest(() => api.get(`/delivered-trips/${id}`))
}

export function getDeliveredTrips(filters?: DeliveredTripFilters): Promise<ApiResponse<PaginatedResult<DeliveredTrip>>> {
  return safeRequest(() => {
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
    return api.get('/delivered-trips', { params })
  }, (res) => unwrapPaginated<DeliveredTrip>(res.data, (raw) => toCamel<DeliveredTrip>(raw)))
}

// Submit-critical writes get a tighter 5s timeout (axios default is 30s) so a
// hanging request can't strand the driver at the submit button. The photo
// upload stays at the default — it's best-effort and carries a larger payload.
const SUBMIT_TIMEOUT = 5000

export function createDeliveredTrip(data: DeliveredTripCreatePayload): Promise<ApiResponse<DeliveredTrip>> {
  return safeRequest(() => {
    const { photoDataUrl, ...rest } = data
    const body = toSnake(rest)
    if (photoDataUrl) body.image_data = stripBase64Prefix(photoDataUrl)
    return api.post('/delivered-trips', body, { timeout: SUBMIT_TIMEOUT })
  })
}

export interface OCRContainerResponse {
  success: boolean
  containerNumbers: string[]
  error: string | null
}

export async function ocrContainer(imageDataUrl: string): Promise<OCRContainerResponse> {
  const base64 = stripBase64Prefix(imageDataUrl)
  // OCR is the one long endpoint: the backend model chain (32B 15s → Plus 55s)
  // plus the analytics DB write can run up to ~70s, so wait past the default
  // 60s axios timeout. Targeted override — other endpoints keep the 60s default.
  const res = await api.post(
    '/delivered-trips/ocr-container',
    {
      image_data: base64,
      mime_type: 'image/jpeg',
    },
    { timeout: 75000 },
  )
  return {
    success: res.data.success,
    containerNumbers: res.data.container_numbers ?? [],
    error: res.data.error,
  }
}

export function deleteDeliveredTrip(id: number): Promise<ApiResponse<void>> {
  return safeRequest(() => api.delete(`/delivered-trips/${id}`), () => undefined as unknown as void)
}

export function updateDeliveredTrip(id: number, data: DeliveredTripUpdatePayload): Promise<ApiResponse<DeliveredTrip>> {
  return safeRequest(() => api.put(`/delivered-trips/${id}`, toSnake(data), { timeout: SUBMIT_TIMEOUT }))
}

export function uploadDeliveredTripPhoto(id: number, imageDataUrl: string): Promise<ApiResponse<DeliveredTrip>> {
  return safeRequest(() => {
    const base64 = stripBase64Prefix(imageDataUrl)
    return api.put(`/delivered-trips/${id}/photo`, { image_data: base64 })
  })
}

export function validateContainer(
  containerNumber: string,
): Promise<ApiResponse<{ valid: boolean; error?: string; suggestions?: string[] }>> {
  return safeRequest(() => api.get('/delivered-trips/validate-container', {
    params: { container_number: containerNumber },
  }), (res) => ({
    valid: res.data.valid,
    error: res.data.error,
    suggestions: res.data.suggestions ?? [],
  }))
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

export function getSuggestedRoutes(
  lat?: number | null,
  lng?: number | null,
  limit = 100,
): Promise<ApiResponse<SuggestedRoute[]>> {
  return safeRequest(() => {
    const params: Record<string, string> = { limit: String(limit) }
    if (lat != null && lng != null) {
      params.lat = String(lat)
      params.lng = String(lng)
    }
    return api.get('/drivers/me/suggested-routes', { params })
  }, (res) => (res.data?.items ?? []) as SuggestedRoute[])
}

export interface BulkImportAndMatchResult {
  totalRows: number
  created: number
  matched: number
  warnings: number
  unmatched: number
  errors: string[]
}

export function bulkImportAndMatch(file: File, clientId?: number): Promise<ApiResponse<BulkImportAndMatchResult>> {
  return safeRequest(() => {
    const formData = new FormData()
    formData.append('file', file)
    if (clientId) formData.append('client_id', String(clientId))
    return api.post('/delivered-trips/bulk-import-and-match', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  })
}

export interface DuplicateContainerGroup {
  contNumber: string
  count: number
  tripIds: number[]
  tripDates: (string | null)[]
  driverIds: (number | null)[]
}

export interface DuplicateContainersResult {
  groups: DuplicateContainerGroup[]
  totalGroups: number
  totalExtraRows: number
}

export interface DuplicateContainersFilters {
  dateFrom?: string
  dateTo?: string
  clientId?: number
  driverId?: number
}

export function getDuplicateContainers(
  filters?: DuplicateContainersFilters,
): Promise<ApiResponse<DuplicateContainersResult>> {
  return safeRequest(() => {
    const params: Record<string, string> = {}
    if (filters?.dateFrom) params.date_from = filters.dateFrom
    if (filters?.dateTo) params.date_to = filters.dateTo
    if (filters?.clientId != null) params.client_id = String(filters.clientId)
    if (filters?.driverId != null) params.driver_id = String(filters.driverId)
    return api.get('/delivered-trips/duplicate-containers', { params })
  }, (res) => toCamel<DuplicateContainersResult>(res.data))
}

// ── Submit-time duplicate check (driver warning) ─────────────────────────

export interface DuplicateCheckCandidate {
  tripId: number
  contNumber: string | null
  tripDate: string | null
  workType: string
  createdAt: string | null
  /** 'photo' = identical photo hash (strongest); 'fields' = container + route + type. */
  reason: 'photo' | 'fields'
  photoMatch: boolean
}

export interface DuplicateCheckResult {
  candidates: DuplicateCheckCandidate[]
}

export interface DeliveredTripDuplicateCheckPayload {
  contNumber?: string | null
  contType?: string | null
  pickupLocationId: number
  dropoffLocationId: number
  tripDate?: string | null
  /** Optional data-URL of the captured photo; its hash is the strongest signal. */
  photoDataUrl?: string | null
  /** Omit a trip from the check (e.g. the trip being edited). */
  excludeTripId?: number | null
}

export function checkDeliveredTripDuplicate(
  payload: DeliveredTripDuplicateCheckPayload,
): Promise<ApiResponse<DuplicateCheckResult>> {
  return safeRequest(() => {
    const { photoDataUrl, ...rest } = payload
    const body = toSnake(rest)
    // image_data must be raw base64 (no data: prefix), matching the photo upload API.
    if (photoDataUrl) body.image_data = stripBase64Prefix(photoDataUrl)
    return api.post('/delivered-trips/duplicate-check', body)
  }, (res) => toCamel<DuplicateCheckResult>(res.data))
}

type ContTypeStats = import('@/data/domain').ContTypeStats

export function getContTypeStats(filters?: {
  driverId?: number
  dateFrom?: string
  dateTo?: string
}): Promise<ApiResponse<ContTypeStats>> {
  return safeRequest(() => {
    const params: Record<string, string> = {}
    if (filters?.driverId != null) params.driver_id = String(filters.driverId)
    if (filters?.dateFrom) params.date_from = filters.dateFrom
    if (filters?.dateTo) params.date_to = filters.dateTo
    return api.get('/delivered-trips/cont-type-stats', { params })
  }, (res) => res.data as ContTypeStats)
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

export function parsePreview(file: File): Promise<ApiResponse<TemplateParseResult>> {
  return safeRequest(() => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/delivered-trips/parse-preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  })
}
