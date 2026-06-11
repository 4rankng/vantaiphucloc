import { api } from './client'
import { safeRequest, toCamel, toSnake } from '@/lib/safe-request'
import { unwrapPaginated } from './utils'
import type {
  BookedTrip,
  ApiResponse,
  PaginatedResult,
} from '@/data/domain'

interface BookedTripFilters {
  clientId?: number
  matched?: boolean
  dateFrom?: string
  dateTo?: string
  unpriced?: boolean
  page?: number
  pageSize?: number
}

export interface BookedTripCreatePayload {
  tripDate: string
  clientId: number
  pickupLocationId: number
  dropoffLocationId: number
  contNumber?: string | null
  contType?: string | null
  pricingId?: number | null
  unitPrice: number
  driverSalary: number
  matchedDeliveredTripIds?: number[]
}

export interface BookedTripUpdatePayload {
  tripDate?: string
  clientId?: number
  pickupLocationId?: number
  dropoffLocationId?: number
  contNumber?: string | null
  contType?: string | null
  vessel?: string | null
  vehiclePlate?: string | null
  pricingId?: number | null
  unitPrice?: number
  driverSalary?: number
  matched?: boolean
  isConfirmed?: boolean
  matchedDeliveredTripIds?: number[]
}

export function getBookedTrip(id: number): Promise<ApiResponse<BookedTrip>> {
  return safeRequest(() => api.get(`/booked-trips/${id}`))
}

export function getBookedTrips(filters?: BookedTripFilters): Promise<ApiResponse<PaginatedResult<BookedTrip>>> {
  return safeRequest(() => {
    const params: Record<string, string> = {}
    if (filters?.clientId) params.client_id = String(filters.clientId)
    if (filters?.matched !== undefined) params.matched = String(filters.matched)
    if (filters?.dateFrom) params.date_from = filters.dateFrom
    if (filters?.dateTo) params.date_to = filters.dateTo
    if (filters?.unpriced !== undefined) params.unpriced = String(filters.unpriced)
    params.page = String(filters?.page ?? 1)
    params.page_size = String(filters?.pageSize ?? 50)
    return api.get('/booked-trips', { params })
  }, (res) => unwrapPaginated<BookedTrip>(res.data, (raw) => toCamel<BookedTrip>(raw)))
}

export function createBookedTrip(data: BookedTripCreatePayload): Promise<ApiResponse<BookedTrip>> {
  return safeRequest(() => api.post('/booked-trips', toSnake(data)))
}

export function updateBookedTrip(id: number, data: BookedTripUpdatePayload): Promise<ApiResponse<BookedTrip>> {
  return safeRequest(() => api.put(`/booked-trips/${id}`, toSnake(data)))
}

export function toggleTripConfirmation(bookedTripId: number): Promise<ApiResponse<BookedTrip>> {
  return safeRequest(() => api.put(`/booked-trips/${bookedTripId}/confirm`))
}

export interface ImportResult {
  created: number
  errors: string[]
}

export function importBookedTrips(file: File): Promise<ApiResponse<ImportResult>> {
  return safeRequest(() => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/booked-trips/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  })
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

export async function getDistinctTripPartners(params?: { dateFrom?: string; dateTo?: string }): Promise<{ id: number; name: string }[]> {
  const res = await api.get('/booked-trips/distinct-partners', { params: toSnake(params ?? {}) })
  return res.data
}
