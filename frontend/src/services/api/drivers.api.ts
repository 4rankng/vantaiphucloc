import { api } from './client'
import { safeRequest, toCamel, toSnake } from '@/lib/safe-request'
import { unwrapList, unwrapPaginated } from './utils'
import type { Driver, ApiResponse, PaginatedResult } from '@/data/domain'

export type DriverSortBy = 'username' | 'full_name' | 'phone'
export type SortOrder = 'asc' | 'desc'

export interface DriverFilters {
  search?: string
  sortBy?: DriverSortBy
  sortOrder?: SortOrder
  page?: number
  pageSize?: number
}

export function getDrivers(): Promise<ApiResponse<Driver[]>> {
  return safeRequest(() => api.get('/drivers', { params: { page_size: 500 } }),
    (res) => toCamel<Driver[]>(unwrapList(res.data)),
  )
}

export function getDriversPaged(filters?: DriverFilters): Promise<ApiResponse<PaginatedResult<Driver>>> {
  return safeRequest(() => {
    const params: Record<string, string> = {}
    if (filters?.search) params.search = filters.search
    if (filters?.sortBy) params.sort_by = filters.sortBy
    if (filters?.sortOrder) params.sort_order = filters.sortOrder
    params.page = String(filters?.page ?? 1)
    params.page_size = String(filters?.pageSize ?? 50)
    return api.get('/drivers', { params })
  }, (res) => unwrapPaginated<Driver>(res.data, (raw) => toCamel<Driver>(raw)))
}

export function createDriver(
  data: { username: string; fullName?: string; phone: string; password?: string; plate?: string },
): Promise<ApiResponse<Driver>> {
  return safeRequest(() => api.post('/drivers', toSnake(data)))
}

export function updateDriver(
  id: number,
  data: Partial<{ fullName: string; phone: string; username: string }>,
): Promise<ApiResponse<Driver>> {
  return safeRequest(() => api.put(`/drivers/${id}`, toSnake(data)))
}

export function resetDriverPassword(
  driverId: number,
  newPassword: string,
): Promise<ApiResponse<{ message: string }>> {
  return safeRequest(() => api.put(`/drivers/${driverId}/reset-password`, { new_password: newPassword }),
    (res) => res.data,
  )
}

export function deleteDriver(id: number): Promise<ApiResponse<void>> {
  return safeRequest(() => api.delete(`/drivers/${id}`), () => undefined)
}
