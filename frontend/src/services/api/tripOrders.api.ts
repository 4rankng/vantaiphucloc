import { api } from './client'
import { toCamel, toSnake, ok, fail, unwrapList } from './utils'
import type { TripOrder, ApiResponse } from '@/data/domain'

interface TripOrderFilters {
  clientId?: number
  driverId?: number
  status?: TripOrder['status']
  dateFrom?: string
  dateTo?: string
}

export async function getTripOrders(filters?: TripOrderFilters): Promise<ApiResponse<TripOrder[]>> {
  try {
    const params: Record<string, string> = {}
    if (filters?.clientId) params.client_id = String(filters.clientId)
    if (filters?.driverId) params.driver_id = String(filters.driverId)
    if (filters?.status) params.status = filters.status
    if (filters?.dateFrom) params.date_from = filters.dateFrom
    if (filters?.dateTo) params.date_to = filters.dateTo
    const res = await api.get('/trip-orders', { params })
    return ok(toCamel<TripOrder[]>(unwrapList(res.data)))
  } catch (err) {
    return fail(err)
  }
}

export async function createTripOrder(
  data: Omit<TripOrder, 'id' | 'createdAt' | 'status'>,
): Promise<ApiResponse<TripOrder>> {
  try {
    const res = await api.post('/trip-orders', toSnake(data))
    return ok(toCamel<TripOrder>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateTripOrder(id: number, data: Partial<TripOrder>): Promise<ApiResponse<TripOrder>> {
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
