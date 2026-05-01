import { api } from './client'
import { toCamel, toSnake, ok, fail, isNetworkError, unwrapList } from './utils'
import { setCache, getCache } from '@/lib/offline-db'
import { offlineQueue } from '@/lib/offline-queue'
import type { WorkOrder, ApiResponse } from '@/data/domain'

interface WorkOrderFilters {
  driverId?: number
  tractorPlate?: string
  dateFrom?: string
  dateTo?: string
  status?: WorkOrder['status']
}

export async function getWorkOrders(filters?: WorkOrderFilters): Promise<ApiResponse<WorkOrder[]>> {
  const cacheKey = `work-orders:${filters?.driverId || ''}:${filters?.status || ''}`
  try {
    const params: Record<string, string> = {}
    if (filters?.driverId) params.driver_id = String(filters.driverId)
    if (filters?.tractorPlate) params.tractor_plate = filters.tractorPlate
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
  data: Omit<WorkOrder, 'id' | 'createdAt' | 'status' | 'unitPrice' | 'driverSalary' | 'allowance' | 'earning' | 'pricingId' | 'gpsAddress'>,
): Promise<ApiResponse<WorkOrder>> {
  const snakeBody = toSnake(data)
  try {
    const res = await api.post('/work-orders', snakeBody)
    const wo = toCamel<WorkOrder>(res.data)
    // Update cache with new work order
    const cacheKey = `work-orders:${data.driverId || ''}:`
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
      // Optimistic payload matching the WorkOrder interface exactly
      const optimistic: WorkOrder = {
        id: -Date.now(), // negative to distinguish from server IDs
        containers: data.containers,
        clientId: data.clientId,
        clientName: data.clientName,
        route: data.route,
        driverId: data.driverId,
        driverName: data.driverName,
        tractorPlate: data.tractorPlate,
        gpsLat: data.gpsLat,
        gpsLng: data.gpsLng,
        gpsAddress: undefined,
        unitPrice: 0,
        driverSalary: 0,
        allowance: 0,
        earning: 0,
        pricingId: undefined,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
        pendingSync: true,
      }
      // Write to cache so it appears in lists immediately
      const cacheKey = `work-orders:${data.driverId || ''}:`
      const cached = await getCache<WorkOrder[]>(cacheKey)
      if (cached) {
        await setCache(cacheKey, [optimistic, ...cached])
      }
      return ok(optimistic)
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

export async function updateWorkOrder(id: number, data: Partial<WorkOrder>): Promise<ApiResponse<WorkOrder>> {
  try {
    const res = await api.put(`/work-orders/${id}`, toSnake(data))
    return ok(toCamel<WorkOrder>(res.data))
  } catch (err) {
    return fail(err)
  }
}
