import { api } from './client'
import { toCamel, toSnake, ok, fail, unwrapList } from './utils'
import type {
  TripOrder,
  TripOrderContainerItem,
  ApiResponse,
  SuggestMatchesResponse,
  SuggestWosResponse,
  ReconciliationUploadResponse,
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
  route: string
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
  route?: string
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
    if (filters?.clientId) params.client_id = String(filters.clientId)
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
  tripOrderId: number,
  reason: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  try {
    const res = await api.post('/reconcile/unmatch', {
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
  dateFrom?: string; dateTo?: string; status?: string
}): Promise<Blob> {
  const params = new URLSearchParams()
  if (filters?.dateFrom) params.append('date_from', filters.dateFrom)
  if (filters?.dateTo) params.append('date_to', filters.dateTo)
  if (filters?.status) params.append('status', filters.status)
  const res = await api.get(`/trip-orders/export?${params.toString()}`, { responseType: 'blob' })
  return res.data
}

export async function downloadTripOrderTemplate(): Promise<Blob> {
  const res = await api.get('/trip-orders/template', { responseType: 'blob' })
  return res.data
}
