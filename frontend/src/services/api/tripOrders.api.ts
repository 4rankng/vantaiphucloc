import { api } from './client'
import { normalizeMany, normalizeOne, toSnake, ok, fail } from './utils'
import type { TripOrder, ApiResponse } from '@/data/domain'

interface TripOrderFilters {
  clientId?: string
  driverId?: string
  status?: TripOrder['status']
  dateFrom?: string
  dateTo?: string
}

export async function getTripOrders(filters?: TripOrderFilters): Promise<ApiResponse<TripOrder[]>> {
  try {
    const params: Record<string, string> = {}
    if (filters?.clientId) params.client_id = filters.clientId
    if (filters?.driverId) params.driver_id = filters.driverId
    if (filters?.status) params.status = filters.status
    if (filters?.dateFrom) params.date_from = filters.dateFrom
    if (filters?.dateTo) params.date_to = filters.dateTo
    const res = await api.get('/trip-orders', { params })
    return ok(normalizeMany<TripOrder>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function createTripOrder(
  data: Omit<TripOrder, 'id' | 'createdAt' | 'status'>,
): Promise<ApiResponse<TripOrder>> {
  try {
    const res = await api.post('/trip-orders', toSnake(data))
    return ok(normalizeOne<TripOrder>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateTripOrder(id: string, data: Partial<TripOrder>): Promise<ApiResponse<TripOrder>> {
  try {
    const res = await api.put(`/trip-orders/${id}`, toSnake(data))
    return ok(normalizeOne<TripOrder>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function reconcile(
  workOrderId: string,
  tripOrderId: string,
): Promise<ApiResponse<TripOrder>> {
  try {
    const res = await api.post('/reconcile', {
      work_order_id: workOrderId,
      trip_order_id: tripOrderId,
    })
    return ok(normalizeOne<TripOrder>(res.data))
  } catch (err) {
    return fail(err)
  }
}
