import { api } from './client'
import { toCamel, toSnake, ok, fail, unwrapList } from './utils'
import type {
  TripOrder,
  TripOrderContainerItem,
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

interface TripOrderFilters {
  clientId?: number
  status?: TripOrder['status']
  dateFrom?: string
  dateTo?: string
  unpriced?: boolean
}

export interface TripOrderCreatePayload {
  tripDate: string
  clientId: number
  pickupLocationId: number
  dropoffLocationId: number
  containers: TripOrderContainerItem[]
  pricingId?: number | null
  unitPrice: number
  driverSalary: number
  allowance: number
  revenue: number
  matchedWorkOrderIds?: number[]
}

export interface TripOrderUpdatePayload {
  tripDate?: string
  clientId?: number
  pickupLocationId?: number
  dropoffLocationId?: number
  containers?: TripOrderContainerItem[]
  pricingId?: number | null
  unitPrice?: number
  driverSalary?: number
  allowance?: number
  revenue?: number
  status?: TripOrder['status']
  isConfirmed?: boolean
  matchedWorkOrderIds?: number[]
}

export async function getTripOrders(filters?: TripOrderFilters): Promise<ApiResponse<TripOrder[]>> {
  try {
    const params: Record<string, string> = {}
    if (filters?.clientId) params.partner_id = String(filters.clientId)
    if (filters?.status) params.status = filters.status
    if (filters?.dateFrom) params.date_from = filters.dateFrom
    if (filters?.dateTo) params.date_to = filters.dateTo
    if (filters?.unpriced !== undefined) params.unpriced = String(filters.unpriced)
    const res = await api.get('/trip-orders', { params })
    return ok(toCamel<TripOrder[]>(unwrapList(res.data)))
  } catch (err) {
    return fail(err)
  }
}

export async function createTripOrder(
  data: TripOrderCreatePayload,
): Promise<ApiResponse<TripOrder>> {
  try {
    const res = await api.post('/trip-orders', toSnake(data))
    return ok(toCamel<TripOrder>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateTripOrder(id: number, data: TripOrderUpdatePayload): Promise<ApiResponse<TripOrder>> {
  try {
    const res = await api.put(`/trip-orders/${id}`, toSnake(data))
    return ok(toCamel<TripOrder>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function reconcile(
  workOrderId: number,
  tripOrderId: number,
): Promise<ApiResponse<TripOrder>> {
  try {
    const res = await api.post('/reconcile', {
      work_order_id: workOrderId,
      trip_order_id: tripOrderId,
    })
    return ok(toCamel<TripOrder>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function unmatch(
  workOrderId: number,
  tripOrderId: number,
  reason: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  try {
    const res = await api.post('/reconcile/unmatch', {
      work_order_id: workOrderId,
      trip_order_id: tripOrderId,
      reason,
    })
    return ok(res.data)
  } catch (err) {
    return fail(err)
  }
}

export async function suggestMatches(
  workOrderId: number,
): Promise<ApiResponse<SuggestMatchesResponse>> {
  try {
    const res = await api.get(`/suggest-matches/${workOrderId}`)
    return ok(toCamel<SuggestMatchesResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function suggestWosForTrip(
  tripOrderId: number,
): Promise<ApiResponse<SuggestWosResponse>> {
  try {
    const res = await api.get(`/suggest-wos/${tripOrderId}`)
    return ok(toCamel<SuggestWosResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function toggleTripConfirmation(
  tripOrderId: number,
): Promise<ApiResponse<TripOrder>> {
  try {
    const res = await api.put(`/trip-orders/${tripOrderId}/confirm`)
    return ok(toCamel<TripOrder>(res.data))
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
    params.append('partner_id', String(clientId))
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
  params.append('partner_id', String(clientId))
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

export async function importTripOrders(file: File): Promise<ApiResponse<ImportResult>> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post('/trip-orders/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return ok(toCamel<ImportResult>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function exportTripOrdersExcel(filters?: {
  dateFrom?: string; dateTo?: string; status?: string; partnerId?: number
}): Promise<Blob> {
  const params = new URLSearchParams()
  if (filters?.dateFrom) params.append('date_from', filters.dateFrom)
  if (filters?.dateTo) params.append('date_to', filters.dateTo)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.partnerId) params.append('partner_id', String(filters.partnerId))
  const res = await api.get(`/trip-orders/export?${params.toString()}`, { responseType: 'blob' })
  return res.data
}

export async function downloadTripOrderTemplate(): Promise<Blob> {
  const res = await api.get('/trip-orders/template', { responseType: 'blob' })
  return res.data
}

// ── Đối soát export ─────────────────────────────────────────────────

export async function exportDoiSoatExcel(
  partnerId: number,
  dateFrom: string,
  dateTo: string,
): Promise<Blob> {
  const params = new URLSearchParams()
  params.append('partner_id', String(partnerId))
  params.append('date_from', dateFrom)
  params.append('date_to', dateTo)
  const res = await api.get(`/trip-orders/export-doi-soat?${params.toString()}`, {
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
  workOrderId: number
  tripOrderId: number
  score: number
  matchScore: number
  maxScore: number
  matchedFields: string[]
  criteria: AutoMatchCriterionFE[]
  suggestedDefault: boolean
  workOrderRef: {
    id: number
    code: string | null
    plate: string | null
    date: string | null
    clientName: string | null
  } | null
  tripOrderRef: {
    id: number
    code: string | null
    clientName: string | null
    containers: TripOrderContainerItem[]
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
  scannedWorkOrderCount: number
  skippedAlreadyMatched: number
  candidates: AutoMatchCandidateFE[]
  unmatchedWorkOrderRefs: { id: number; code: string | null; plate: string | null; date: string | null }[]
  errors: string[]
  stats: AutoMatchStatsFE
}

export interface AutoMatchConfirmResultFE {
  workOrderId: number
  tripOrderId: number
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
  pairs: { workOrderId: number; tripOrderId: number }[],
): Promise<ApiResponse<AutoMatchConfirmResponseFE>> {
  try {
    const res = await api.post('/reconcile/auto-match/confirm', {
      pairs: pairs.map(p => ({ work_order_id: p.workOrderId, trip_order_id: p.tripOrderId })),
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
      pairs: pairs.map(p => ({ work_order_id: p.workOrderId, trip_order_id: p.tripOrderId })),
    })
    return ok(toCamel<BulkMatchResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

// ── Batch Match for WO (1 WO → N TripOrders) ─────────────────────

export async function batchReconcileForWO(
  workOrderId: number,
  tripOrderIds: number[],
): Promise<ApiResponse<BatchMatchForWOResponse>> {
  try {
    const res = await api.post('/reconcile/batch-for-wo', {
      work_order_id: workOrderId,
      trip_order_ids: tripOrderIds,
    })
    return ok(toCamel<BatchMatchForWOResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

// ── Batch Match for TO (1 TO → N WorkOrders) ─────────────────────

export async function batchReconcileForTO(
  tripOrderId: number,
  workOrderIds: number[],
): Promise<ApiResponse<BatchMatchForTOResponse>> {
  try {
    const res = await api.post('/reconcile/batch-for-to', {
      trip_order_id: tripOrderId,
      work_order_ids: workOrderIds,
    })
    return ok(toCamel<BatchMatchForTOResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

// ── Manual search (bypasses match suggester threshold) ────────────────

export interface SearchResultItem {
  tripOrder: TripOrder
  containerId: number
  confidence: 'full' | 'partial' | 'none'
  matchedFields: string[]
  score: number
  matchScore: number
  maxScore: number
  criteria: { name: string; label: string; match: boolean; woValue: string; toValue: string }[]
}

export interface SearchTripOrdersResponse {
  items: SearchResultItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function searchTripOrders(
  q: string,
  workOrderId: number,
  page = 1,
  pageSize = 20,
): Promise<ApiResponse<SearchTripOrdersResponse>> {
  try {
    const res = await api.get('/trip-orders/search', {
      params: { q, work_order_id: workOrderId, page, page_size: pageSize },
    })
    return ok(toCamel<SearchTripOrdersResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getDistinctTripPartners(params?: { dateFrom?: string; dateTo?: string }): Promise<{ id: number; name: string }[]> {
  const res = await api.get('/trip-orders/distinct-partners', { params: toSnake(params ?? {}) })
  return res.data
}
