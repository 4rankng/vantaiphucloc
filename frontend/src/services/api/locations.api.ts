import { api } from './client'
import { toCamel, toSnake, ok, fail, isNetworkError } from './utils'
import { setCache, getCache } from '@/lib/offline-db'
import type { Location, LocationAlias, ApiResponse } from '@/data/domain'

export async function getLocations(): Promise<ApiResponse<Location[]>> {
  try {
    const res = await api.get('/locations/all')
    const data = toCamel<Location[]>(res.data)
    await setCache('locations', data)
    return ok(data)
  } catch (err) {
    const cached = await getCache<Location[]>('locations')
    if (isNetworkError(err) && cached) return ok(cached)
    return fail(err)
  }
}

export async function createLocation(data: { name: string }): Promise<ApiResponse<Location>> {
  try {
    const res = await api.post('/locations', toSnake(data))
    return ok(toCamel<Location>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateLocation(id: number, data: { name?: string }): Promise<ApiResponse<Location>> {
  try {
    const res = await api.put(`/locations/${id}`, toSnake(data))
    return ok(toCamel<Location>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteLocation(id: number): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/locations/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}

export async function getLocationAliases(): Promise<ApiResponse<LocationAlias[]>> {
  try {
    const res = await api.get('/location-aliases')
    return ok(toCamel<LocationAlias[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function createAlias(data: { locationId: number; alias: string }): Promise<ApiResponse<LocationAlias>> {
  try {
    const res = await api.post('/location-aliases', toSnake(data))
    return ok(toCamel<LocationAlias>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function promoteAlias(aliasId: number): Promise<ApiResponse<Location>> {
  try {
    const res = await api.post(`/location-aliases/${aliasId}/promote`)
    return ok(toCamel<Location>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteAlias(aliasId: number): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/location-aliases/${aliasId}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}

export async function mergeLocations(data: { sourceLocationId: number; targetLocationId: number }): Promise<ApiResponse<Location>> {
  try {
    const res = await api.post('/locations/merge', toSnake(data))
    return ok(toCamel<Location>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function previewLocationImport(file: File): Promise<ApiResponse<{
  filename: string
  sheetName: string
  rows: Array<{ name: string; row: number; column: number }>
  totalCount: number
  duplicateNames: string[]
  alreadyExist: string[]
  newNames: string[]
}>> {
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post('/locations/import/preview', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return ok(toCamel(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function commitLocationImport(names: string[]): Promise<ApiResponse<{
  created: number
  skippedExisting: number
  errors: string[]
}>> {
  try {
    const res = await api.post('/locations/import/commit', { names })
    return ok(toCamel(res.data))
  } catch (err) {
    return fail(err)
  }
}
