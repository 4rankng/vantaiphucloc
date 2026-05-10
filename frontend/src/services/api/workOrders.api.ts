import { api } from './client'
import { toCamel, toSnake, ok, fail, isNetworkError, unwrapList } from './utils'
import { setCache, getCache } from '@/lib/offline-db'
import { offlineQueue } from '@/lib/offline-queue'
import type { WorkOrder, ContainerItem, ApiResponse } from '@/data/domain'

interface WorkOrderFilters {
  driverId?: number
  dateFrom?: string
  dateTo?: string
  status?: WorkOrder['status']
}

export interface WorkOrderCreatePayload {
  containers: ContainerItem[]
  partnerId: number
  route: string
  pickupLocationId: number
  dropoffLocationId: number
  driverId: number
  gpsLat?: number | null
  gpsLng?: number | null
}

export interface WorkOrderUpdatePayload {
  containers?: ContainerItem[]
  partnerId?: number
  route?: string
  pickupLocationId?: number
  dropoffLocationId?: number
  driverId?: number
  gpsLat?: number | null
  gpsLng?: number | null
  unitPrice?: number
  driverSalary?: number
  allowance?: number
  earning?: number
  status?: WorkOrder['status']
}

export async function getWorkOrder(id: number): Promise<ApiResponse<WorkOrder>> {
  try {
    const res = await api.get(`/work-orders/${id}`)
    return ok(toCamel<WorkOrder>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getWorkOrders(filters?: WorkOrderFilters): Promise<ApiResponse<WorkOrder[]>> {
  const cacheKey = `work-orders:${filters?.driverId || ''}:${filters?.status || ''}`
  try {
    const params: Record<string, string> = {}
    if (filters?.driverId) params.driver_id = String(filters.driverId)
    if (filters?.dateFrom) params.date_from = filters.dateFrom
    if (filters?.dateTo) params.date_to = filters.dateTo
    if (filters?.status) params.status = filters.status
    const res = await api.get('/work-orders', { params })
    const data = toCamel<WorkOrder[]>(unwrapList(res.data))
    await setCache(cacheKey, data)
    return ok(data)
  } catch (err) {
    const cached = await getCache<WorkOrder[]>(cacheKey)
    if (isNetworkError(err) && cached) return ok(cached)
    return fail(err)
  }
}

export async function createWorkOrder(
  data: WorkOrderCreatePayload,
): Promise<ApiResponse<WorkOrder>> {
  const snakeBody = toSnake(data)
  try {
    const res = await api.post('/work-orders', snakeBody)
    const wo = toCamel<WorkOrder>(res.data)
    const cacheKey = `work-orders:${data.driverId || ''}:${data.partnerId || ''}`
    const cached = await getCache<WorkOrder[]>(cacheKey)
    if (cached) {
      await setCache(cacheKey, [wo, ...cached])
    }
    return ok(wo)
  } catch (err) {
    if (isNetworkError(err)) {
      await offlineQueue.enqueue({
        endpoint: '/api/v1/work-orders',
        method: 'POST',
        body: snakeBody,
      })
      // Offline path: enqueue and return a placeholder; server will fill in
      // the canonical (nested) shape when it syncs back. We don't fabricate
      // ClientSummary/DriverSummary/LocationSummary here.
      return ok({
        id: -Date.now(),
        containers: data.containers,
        partner: { id: data.partnerId, name: '', code: null },
        route: data.route,
        pickupLocation: { id: data.pickupLocationId, name: '' },
        dropoffLocation: { id: data.dropoffLocationId, name: '' },
        driver: { id: data.driverId, name: '' },
        gpsLat: data.gpsLat ?? 0,
        gpsLng: data.gpsLng ?? 0,
        gpsAddress: undefined,
        unitPrice: 0,
        driverSalary: 0,
        allowance: 0,
        pricingId: undefined,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
        pendingSync: true,
      } satisfies WorkOrder)
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
  const res = await api.post('/work-orders/ocr-container', {
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

export async function updateWorkOrder(id: number, data: WorkOrderUpdatePayload): Promise<ApiResponse<WorkOrder>> {
  try {
    const res = await api.put(`/work-orders/${id}`, toSnake(data))
    return ok(toCamel<WorkOrder>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function validateContainer(containerNumber: string): Promise<ApiResponse<{ valid: boolean; error?: string }>> {
  try {
    const res = await api.get('/work-orders/validate-container', {
      params: { container_number: containerNumber },
    })
    return ok({ valid: res.data.valid, error: res.data.error })
  } catch (err) {
    return fail(err)
  }
}

export async function exportWorkOrdersExcel(filters?: {
  dateFrom?: string; dateTo?: string; status?: string
}): Promise<Blob> {
  const params = new URLSearchParams()
  if (filters?.dateFrom) params.append('date_from', filters.dateFrom)
  if (filters?.dateTo) params.append('date_to', filters.dateTo)
  if (filters?.status) params.append('status', filters.status)
  const res = await api.get(`/work-orders/export?${params.toString()}`, { responseType: 'blob' })
  return res.data
}
