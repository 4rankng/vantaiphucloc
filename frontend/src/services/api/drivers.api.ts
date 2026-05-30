import { api } from './client'
import { toCamel, toSnake, ok, fail, unwrapList, unwrapPaginated } from './utils'
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

export async function getDrivers(): Promise<ApiResponse<Driver[]>> {
  try {
    const res = await api.get('/drivers', { params: { page_size: 500 } })
    return ok(toCamel<Driver[]>(unwrapList(res.data)))
  } catch (err) {
    return fail(err)
  }
}

export async function getDriversPaged(filters?: DriverFilters): Promise<ApiResponse<PaginatedResult<Driver>>> {
  try {
    const params: Record<string, string> = {}
    if (filters?.search) params.search = filters.search
    if (filters?.sortBy) params.sort_by = filters.sortBy
    if (filters?.sortOrder) params.sort_order = filters.sortOrder
    params.page = String(filters?.page ?? 1)
    params.page_size = String(filters?.pageSize ?? 50)
    const res = await api.get('/drivers', { params })
    return ok(unwrapPaginated<Driver>(res.data, (raw) => toCamel<Driver>(raw)))
  } catch (err) {
    return fail(err)
  }
}

export async function createDriver(
  data: { username: string; fullName?: string; phone: string; password?: string; plate?: string },
): Promise<ApiResponse<Driver>> {
  try {
    const res = await api.post('/drivers', toSnake(data))
    return ok(toCamel<Driver>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateDriver(
  id: number,
  data: Partial<{ fullName: string; phone: string; username: string }>,
): Promise<ApiResponse<Driver>> {
  try {
    const res = await api.put(`/drivers/${id}`, toSnake(data))
    return ok(toCamel<Driver>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function resetDriverPassword(
  driverId: number,
  newPassword: string,
): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await api.put(`/drivers/${driverId}/reset-password`, { new_password: newPassword })
    return ok(res.data)
  } catch (err) {
    return fail(err)
  }
}

export async function deleteDriver(id: number): Promise<ApiResponse<void>> {
  try {
    await api.delete(`/drivers/${id}`)
    return ok(undefined)
  } catch (err) {
    return fail(err)
  }
}
