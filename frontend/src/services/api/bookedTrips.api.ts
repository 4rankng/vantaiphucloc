import { api } from './client'
import { toCamel, toSnake, ok, fail, unwrapList } from './utils'
import type {
  BookedTrip,
  BookedTripContainerItem,
  ApiResponse,
  SuggestMatchesResponse,
  SuggestWosResponse,
  ReconciliationUploadResponse,
  MatchScoresResponse,
  BulkMatchResponse,
  BulkMatchPair,
  BatchMatchForWOResponse,
  BatchMatchForTOResponse,
} from '@/data/domain'

interface BookedTripFilters {
  clientId?: number
  status?: BookedTrip['status']
  dateFrom?: string
  dateTo?: string
  unpriced?: boolean
  pageSize?: number
}

export interface BookedTripCreatePayload {
  tripDate: string
  clientId: number
  pickupLocationId: number
  dropoffLocationId: number
  containers: BookedTripContainerItem[]
  pricingId?: number | null
  unitPrice: number
  driverSalary: number
  allowance: number
  revenue: number
  matchedDeliveredTripIds?: number[]
}

export interface BookedTripUpdatePayload {
  tripDate?: string
  clientId?: number
  pickupLocationId?: number
  dropoffLocationId?: number
  containers?: BookedTripContainerItem[]
  vessel?: string | null
  vehiclePlate?: string | null
  operationType?: string | null
  pricingId?: number | null
  unitPrice?: number
  driverSalary?: number
  allowance?: number
  revenue?: number
  status?: BookedTrip['status']
  isConfirmed?: boolean
  matchedDeliveredTripIds?: number[]
}

export async function getBookedTrip(id: number): Promise<ApiResponse<BookedTrip>> {
  try {
    const res = await api.get(`/booked-trips/${id}`)
    return ok(toCamel<BookedTrip>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getBookedTrips(filters?: BookedTripFilters): Promise<ApiResponse<BookedTrip[]>> {
  try {
    const params: Record<string, string> = {}
    if (filters?.clientId) params.client_id = String(filters.clientId)
    if (filters?.status) params.status = filters.status
    if (filters?.dateFrom) params.date_from = filters.dateFrom
    if (filters?.dateTo) params.date_to = filters.dateTo
    if (filters?.unpriced !== undefined) params.unpriced = String(filters.unpriced)
    if (filters?.pageSize) params.page_size = String(filters.pageSize)
    const res = await api.get('/booked-trips', { params })
    return ok(toCamel<BookedTrip[]>(unwrapList(res.data)))
  } catch (err) {
    return fail(err)
  }
}

export async function createBookedTrip(
  data: BookedTripCreatePayload,
): Promise<ApiResponse<BookedTrip>> {
  try {
    const res = await api.post('/booked-trips', toSnake(data))
    return ok(toCamel<BookedTrip>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateBookedTrip(id: number, data: BookedTripUpdatePayload): Promise<ApiResponse<BookedTrip>> {
  try {
    const res = await api.put(`/booked-trips/${id}`, toSnake(data))
    return ok(toCamel<BookedTrip>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function reconcile(
  deliveredTripId: number,
  bookedTripId: number,
): Promise<ApiResponse<BookedTrip>> {
  try {
    const res = await api.post('/reconcile', {
      delivered_trip_id: deliveredTripId,
      booked_trip_id: bookedTripId,
    })
    return ok(toCamel<BookedTrip>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function unmatch(
  deliveredTripId: number,
  bookedTripId: number,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  try {
    const res = await api.post('/reconcile/unmatch', {
      delivered_trip_id: deliveredTripId,
      booked_trip_id: bookedTripId,
    })
    return ok(res.data)
  } catch (err) {
    return fail(err)
  }
}

export async function suggestMatches(
  deliveredTripId: number,
): Promise<ApiResponse<SuggestMatchesResponse>> {
  try {
    const res = await api.get(`/suggest-matches/${deliveredTripId}`)
    return ok(toCamel<SuggestMatchesResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function suggestWosForTrip(
  bookedTripId: number,
): Promise<ApiResponse<SuggestWosResponse>> {
  try {
    const res = await api.get(`/suggest-wos/${bookedTripId}`)
    return ok(toCamel<SuggestWosResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function toggleTripConfirmation(
  bookedTripId: number,
): Promise<ApiResponse<BookedTrip>> {
  try {
    const res = await api.put(`/booked-trips/${bookedTripId}/confirm`)
    return ok(toCamel<BookedTrip>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function uploadCustomerExcel(
  file: File,
  clientId: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<ApiResponse<ReconciliationUploadResponse>> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const params = new URLSearchParams()
    params.append('client_id', String(clientId))
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)

    const res = await api.post(`/reconcile/upload-excel?${params.toString()}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return ok(toCamel<ReconciliationUploadResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function exportReconciliationExcel(
  clientId: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<Blob> {
  const params = new URLSearchParams()
  params.append('client_id', String(clientId))
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)

  const res = await api.get(`/reconcile/export-excel?${params.toString()}`, {
    responseType: 'blob',
  })
  return res.data
}

export interface ImportResult {
  created: number
  errors: string[]
}

export async function importBookedTrips(file: File): Promise<ApiResponse<ImportResult>> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post('/booked-trips/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return ok(toCamel<ImportResult>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function exportBookedTripsExcel(filters?: {
  dateFrom?: string; dateTo?: string; status?: string; clientId?: number
}): Promise<Blob> {
  const params = new URLSearchParams()
  if (filters?.dateFrom) params.append('date_from', filters.dateFrom)
  if (filters?.dateTo) params.append('date_to', filters.dateTo)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.clientId) params.append('client_id', String(filters.clientId))
  const res = await api.get(`/booked-trips/export?${params.toString()}`, { responseType: 'blob' })
  return res.data
}

export async function downloadBookedTripTemplate(): Promise<Blob> {
  const res = await api.get('/booked-trips/template', { responseType: 'blob' })
  return res.data
}

// ── Đối soát export ─────────────────────────────────────────────────

export async function exportDoiSoatExcel(
  clientId: number,
  dateFrom: string,
  dateTo: string,
): Promise<Blob> {
  const params = new URLSearchParams()
  params.append('client_id', String(clientId))
  params.append('date_from', dateFrom)
  params.append('date_to', dateTo)
  const res = await api.get(`/booked-trips/export-doi-soat?${params.toString()}`, {
    responseType: 'blob',
  })
  return res.data
}

// ── Auto-match (preview + confirm) ─────────────────────────────────

export interface AutoMatchCriterionFE {
  key: string
  label: string
  match: boolean
}

export interface AutoMatchCandidateFE {
  deliveredTripId: number
  bookedTripId: number
  score: number
  matchScore: number
  maxScore: number
  matchedFields: string[]
  criteria: AutoMatchCriterionFE[]
  suggestedDefault: boolean
  deliveredTripRef: {
    id: number
    code: string | null
    plate: string | null
    date: string | null
    clientName: string | null
  } | null
  bookedTripRef: {
    id: number
    code: string | null
    clientName: string | null
    containers: BookedTripContainerItem[]
  } | null
}

export interface AutoMatchRejectionReasonFE {
  code: string
  label: string
  count: number
}

export interface AutoMatchStatsFE {
  reasons: AutoMatchRejectionReasonFE[]
}

export interface AutoMatchPreviewResponseFE {
  scannedDeliveredTripCount: number
  skippedAlreadyMatched: number
  candidates: AutoMatchCandidateFE[]
  unmatchedDeliveredTripRefs: { id: number; code: string | null; plate: string | null; date: string | null }[]
  errors: string[]
  stats: AutoMatchStatsFE
}

export interface AutoMatchConfirmResultFE {
  deliveredTripId: number
  bookedTripId: number
  success: boolean
  error: string | null
}

export interface AutoMatchConfirmResponseFE {
  matched: AutoMatchConfirmResultFE[]
  failed: AutoMatchConfirmResultFE[]
  durationMs: number
}

export async function autoMatchPreview(
  dateFrom?: string,
  dateTo?: string,
): Promise<ApiResponse<AutoMatchPreviewResponseFE>> {
  try {
    const res = await api.post('/reconcile/auto-match', {
      date_from: dateFrom ?? null,
      date_to: dateTo ?? null,
    })
    return ok(toCamel<AutoMatchPreviewResponseFE>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function autoMatchConfirm(
  pairs: { deliveredTripId: number; bookedTripId: number }[],
): Promise<ApiResponse<AutoMatchConfirmResponseFE>> {
  try {
    const res = await api.post('/reconcile/auto-match/confirm', {
      pairs: pairs.map(p => ({ delivered_trip_id: p.deliveredTripId, booked_trip_id: p.bookedTripId })),
    })
    return ok(toCamel<AutoMatchConfirmResponseFE>(res.data))
  } catch (err) {
    return fail(err)
  }
}

// Legacy alias
export const autoMatch = autoMatchPreview
export type AutoMatchResponse = AutoMatchPreviewResponseFE
export type AutoMatchResult = AutoMatchCandidateFE

// ── Match Scores (lightweight for master list) ───────────────────────

export async function getMatchScores(
  dateFrom?: string,
  dateTo?: string,
): Promise<ApiResponse<MatchScoresResponse>> {
  try {
    const params = new URLSearchParams()
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)
    const res = await api.get(`/match-scores?${params.toString()}`)
    return ok(toCamel<MatchScoresResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

// ── Bulk Match ──────────────────────────────────────────────────────

export async function bulkMatch(
  pairs: BulkMatchPair[],
): Promise<ApiResponse<BulkMatchResponse>> {
  try {
    const res = await api.post('/reconcile/bulk-match', {
      pairs: pairs.map(p => ({ delivered_trip_id: p.deliveredTripId, booked_trip_id: p.bookedTripId })),
    })
    return ok(toCamel<BulkMatchResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

// ── Batch Match for WO (1 WO → N BookedTrips) ─────────────────────

export async function batchReconcileForWO(
  deliveredTripId: number,
  bookedTripIds: number[],
): Promise<ApiResponse<BatchMatchForWOResponse>> {
  try {
    const res = await api.post('/reconcile/batch-for-wo', {
      delivered_trip_id: deliveredTripId,
      booked_trip_ids: bookedTripIds,
    })
    return ok(toCamel<BatchMatchForWOResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

// ── Batch Match for TO (1 TO → N DeliveredTrips) ─────────────────────

export async function batchReconcileForTO(
  bookedTripId: number,
  deliveredTripIds: number[],
): Promise<ApiResponse<BatchMatchForTOResponse>> {
  try {
    const res = await api.post('/reconcile/batch-for-to', {
      booked_trip_id: bookedTripId,
      delivered_trip_ids: deliveredTripIds,
    })
    return ok(toCamel<BatchMatchForTOResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

// ── Manual search (bypasses match suggester threshold) ────────────────

export interface SearchResultItem {
  bookedTrip: BookedTrip
  containerId: number
  confidence: 'full' | 'partial' | 'none'
  matchedFields: string[]
  score: number
  matchScore: number
  maxScore: number
  criteria: { name: string; label: string; match: boolean; woValue: string; toValue: string }[]
}

export interface SearchBookedTripsResponse {
  items: SearchResultItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function searchBookedTrips(
  q: string,
  deliveredTripId: number,
  page = 1,
  pageSize = 20,
): Promise<ApiResponse<SearchBookedTripsResponse>> {
  try {
    const res = await api.get('/booked-trips/search', {
      params: { q, delivered_trip_id: deliveredTripId, page, page_size: pageSize },
    })
    return ok(toCamel<SearchBookedTripsResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getDistinctTripPartners(params?: { dateFrom?: string; dateTo?: string }): Promise<{ id: number; name: string }[]> {
  const res = await api.get('/booked-trips/distinct-partners', { params: toSnake(params ?? {}) })
  return res.data
}
