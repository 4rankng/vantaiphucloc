/**
 * Real HTTP API client — calls the FastAPI backend.
 *
 * Key conventions:
 *  - toCamel  : recursively converts snake_case keys → camelCase on all responses
 *  - toSnake  : converts camelCase keys → snake_case for request bodies
 *  - toStringId: converts integer `id` fields to strings so existing string-ID
 *                comparisons in page components continue to work
 *  - All calls are wrapped in try/catch; failures return
 *    { data: null, success: false, message: error.message }
 */

import { api } from './client'
import type {
  Client,
  RoutePrice,
  Pricing,
  WorkOrder,
  TripOrder,
  SalaryPeriod,
  Driver,
  ApiResponse,
  WorkType,
} from '@/data/domain'
import { setCache, getCache, uuid } from '@/lib/offline-db'
import { offlineQueue } from '@/lib/offline-queue'

// ─── Case-conversion utilities ────────────────────────────────────────────────

function isNetworkError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'type' in err) {
    return (err as { type: string }).type === 'network'
  }
  if (err instanceof Error) {
    return err.message.includes('Network Error') || err.message.includes('timeout')
  }
  return !navigator.onLine
}

/** Convert a single snake_case string to camelCase */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

/** Convert a single camelCase string to snake_case */
function camelToSnake(s: string): string {
  return s.replace(/([A-Z])/g, (c: string) => '_' + c.toLowerCase())
}

/** Recursively convert all object keys from snake_case to camelCase */
export function toCamel(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toCamel)
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[snakeToCamel(k)] = toCamel(v)
    }
    return result
  }
  return value
}

/** Recursively convert all object keys from camelCase to snake_case */
export function toSnake(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toSnake)
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[camelToSnake(k)] = toSnake(v)
    }
    return result
  }
  return value
}

/**
 * Convert integer `id` fields to strings in a camelCase-converted object.
 * The backend returns integer PKs; the frontend uses string IDs everywhere.
 */
export function toStringId<T extends Record<string, unknown>>(obj: T): T {
  if (obj && typeof obj.id === 'number') {
    return { ...obj, id: String(obj.id) }
  }
  return obj
}

/** Apply toCamel + toStringId to a single response object */
function normalizeOne<T>(raw: unknown): T {
  const camel = toCamel(raw) as Record<string, unknown>
  return toStringId(camel) as T
}

/** Apply toCamel + toStringId to an array of response objects */
function normalizeMany<T>(raw: unknown): T[] {
  return (toCamel(raw) as Record<string, unknown>[]).map(item => toStringId(item) as T)
}

/** Wrap a successful result in the ApiResponse shape */
function ok<T>(data: T): ApiResponse<T> {
  return { data, success: true }
}

/** Wrap an error in the ApiResponse shape */
function fail<T>(err: unknown): ApiResponse<T> {
  const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi'
  return { data: null as unknown as T, success: false, message }
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClients(): Promise<ApiResponse<Client[]>> {
  try {
    const res = await api.get('/clients')
    const data = normalizeMany<Client>(res.data)
    await setCache('clients', data)
    return ok(data)
  } catch (err) {
    const cached = await getCache<Client[]>('clients')
    if (isNetworkError(err) && cached) return ok(cached)
    return fail(err)
  }
}

export async function createClient(data: Omit<Client, 'id'>): Promise<ApiResponse<Client>> {
  try {
    const res = await api.post('/clients', toSnake(data))
    return ok(normalizeOne<Client>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateClient(id: string, data: Partial<Client>): Promise<ApiResponse<Client>> {
  try {
    const res = await api.put(`/clients/${id}`, toSnake(data))
    return ok(normalizeOne<Client>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteClient(id: string): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/clients/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function getRoutes(): Promise<ApiResponse<RoutePrice[]>> {
  try {
    const res = await api.get('/routes')
    const data = normalizeMany<RoutePrice>(res.data)
    await setCache('routes', data)
    return ok(data)
  } catch (err) {
    const cached = await getCache<RoutePrice[]>('routes')
    if (isNetworkError(err) && cached) return ok(cached)
    return fail(err)
  }
}

export async function createRoute(data: Omit<RoutePrice, never>): Promise<ApiResponse<RoutePrice>> {
  try {
    const res = await api.post('/routes', toSnake(data))
    return ok(normalizeOne<RoutePrice>(res.data))
  } catch (err) {
    return fail(err)
  }
}

/**
 * Update a route by its integer or string ID.
 */
export async function updateRoute(id: number | string, data: Partial<RoutePrice>): Promise<ApiResponse<RoutePrice>> {
  try {
    const res = await api.put(`/routes/${id}`, toSnake(data))
    return ok(normalizeOne<RoutePrice>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteRoute(id: number | string): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/routes/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}

// ─── Pricings ─────────────────────────────────────────────────────────────────

export async function getPricings(
  filters?: { clientId?: string; workType?: WorkType; route?: string },
): Promise<ApiResponse<Pricing[]>> {
  try {
    const params: Record<string, string> = {}
    if (filters?.clientId) params.client_id = filters.clientId
    if (filters?.workType) params.work_type = filters.workType
    if (filters?.route) params.route = filters.route
    const res = await api.get('/pricings', { params })
    return ok(normalizeMany<Pricing>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function createPricing(
  data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ApiResponse<Pricing>> {
  try {
    const res = await api.post('/pricings', toSnake(data))
    return ok(normalizeOne<Pricing>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updatePricing(id: string, data: Partial<Pricing>): Promise<ApiResponse<Pricing>> {
  try {
    const res = await api.put(`/pricings/${id}`, toSnake(data))
    return ok(normalizeOne<Pricing>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deletePricing(id: string): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/pricings/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}

// ─── Work Orders ──────────────────────────────────────────────────────────────

interface WorkOrderFilters {
  driverId?: string
  tractorPlate?: string
  dateFrom?: string
  dateTo?: string
  status?: WorkOrder['status']
}

export async function getWorkOrders(filters?: WorkOrderFilters): Promise<ApiResponse<WorkOrder[]>> {
  const cacheKey = `work-orders:${filters?.driverId || ''}:${filters?.status || ''}`
  try {
    const params: Record<string, string> = {}
    if (filters?.driverId) params.driver_id = filters.driverId
    if (filters?.tractorPlate) params.tractor_plate = filters.tractorPlate
    if (filters?.dateFrom) params.date_from = filters.dateFrom
    if (filters?.dateTo) params.date_to = filters.dateTo
    if (filters?.status) params.status = filters.status
    const res = await api.get('/work-orders', { params })
    const data = normalizeMany<WorkOrder>(res.data)
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
    const wo = normalizeOne<WorkOrder>(res.data)
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
        id: `pending-${uuid()}`,
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

export async function updateWorkOrder(id: string, data: Partial<WorkOrder>): Promise<ApiResponse<WorkOrder>> {
  try {
    const res = await api.put(`/work-orders/${id}`, toSnake(data))
    return ok(normalizeOne<WorkOrder>(res.data))
  } catch (err) {
    return fail(err)
  }
}

// ─── Trip Orders ──────────────────────────────────────────────────────────────

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

// ─── Reconcile ──────────────────────────────────────────────────────────────

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

// ─── Salary ───────────────────────────────────────────────────────────────────

export interface AsyncJobResult {
  jobId: string
  message: string
}

export interface JobStatus {
  jobId: string
  status: 'queued' | 'in_progress' | 'complete' | 'not_found'
  result: Record<string, unknown> | null
}

export async function calculateSalary(
  driverId: string,
  startDate: string,
  endDate: string,
): Promise<ApiResponse<AsyncJobResult>> {
  try {
    const res = await api.post('/salary/calculate', {
      driver_id: driverId,
      start_date: startDate,
      end_date: endDate,
    })
    return ok(normalizeOne<AsyncJobResult>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getJobStatus(jobId: string): Promise<ApiResponse<JobStatus>> {
  try {
    const res = await api.get(`/jobs/${jobId}`)
    return ok(normalizeOne<JobStatus>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getSalaryPeriods(driverId?: string): Promise<ApiResponse<SalaryPeriod[]>> {
  try {
    const params: Record<string, string> = {}
    if (driverId) params.driver_id = driverId
    const res = await api.get('/salary', { params })
    return ok(normalizeMany<SalaryPeriod>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateSalaryPeriod(
  id: string,
  data: Partial<SalaryPeriod>,
): Promise<ApiResponse<SalaryPeriod>> {
  try {
    const res = await api.put(`/salary/${id}`, toSnake(data))
    return ok(normalizeOne<SalaryPeriod>(res.data))
  } catch (err) {
    return fail(err)
  }
}

// ─── Drivers ──────────────────────────────────────────────────────────────────

export async function getDrivers(): Promise<ApiResponse<Driver[]>> {
  try {
    const res = await api.get('/drivers')
    return ok(normalizeMany<Driver>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function createDriver(
  data: { username: string; phone: string; tractorPlate?: string; vendor?: string },
): Promise<ApiResponse<Driver>> {
  try {
    const res = await api.post('/drivers', toSnake(data))
    return ok(normalizeOne<Driver>(res.data))
  } catch (err) {
    return fail(err)
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────
// TODO: Add backend GET /notifications endpoint. For now, return empty.

export async function getNotifications(): Promise<ApiResponse<unknown[]>> {
  return ok([])
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * Computes the dashboard summary client-side from work orders and trip orders.
 */
export async function getDashboardSummary(): Promise<ApiResponse<{
  totalRevenue: number
  totalExpense: number
  tripCount: number
  activeTrips: number
  outstandingDebt: number
  monthlyRevenue: { month: string; revenue: number; expense: number }[]
  alerts: unknown[]
}>> {
  try {
    const [woRes, toRes, clientRes] = await Promise.all([
      api.get('/work-orders'),
      api.get('/trip-orders'),
      api.get('/clients'),
    ])

    const workOrders = normalizeMany<WorkOrder>(woRes.data)
    const tripOrders = normalizeMany<TripOrder>(toRes.data)
    const clients = normalizeMany<Client>(clientRes.data)

    // Compute totals from trip orders (revenue) and work orders (expense proxy)
    const totalRevenue = tripOrders.reduce((sum, t) => sum + (t.revenue ?? 0), 0)
    const totalExpense = workOrders.reduce((sum, w) => sum + (w.earning ?? 0), 0)
    const outstandingDebt = clients.reduce((sum, c) => sum + (c.outstandingDebt ?? 0), 0)

    // Active trips = DRAFT or CONFIRMED trip orders
    const activeTrips = tripOrders.filter(
      t => t.status === 'DRAFT' || t.status === 'CONFIRMED',
    ).length

    return ok({
      totalRevenue,
      totalExpense,
      tripCount: tripOrders.length,
      activeTrips,
      outstandingDebt,
      monthlyRevenue: [],
      alerts: [],
    })
  } catch (err) {
    return fail(err)
  }
}
