import { api } from './client'
import { safeRequest, toSnake } from '@/lib/safe-request'
import type { Location, LocationAlias, ApiResponse } from '@/data/domain'

export function getLocations(): Promise<ApiResponse<Location[]>> {
  return safeRequest(() => api.get('/locations/all'))
}

export function createLocation(data: { name: string }): Promise<ApiResponse<Location>> {
  return safeRequest(() => api.post('/locations', toSnake(data)))
}

export function updateLocation(id: number, data: { name?: string }): Promise<ApiResponse<Location>> {
  return safeRequest(() => api.put(`/locations/${id}`, toSnake(data)))
}

export function deleteLocation(id: number): Promise<ApiResponse<{ success: boolean }>> {
  return safeRequest(() => api.delete(`/locations/${id}`), () => ({ success: true }))
}

export function getLocationAliases(): Promise<ApiResponse<LocationAlias[]>> {
  return safeRequest(() => api.get('/location-aliases'))
}

export function createAlias(data: { locationId: number; alias: string }): Promise<ApiResponse<LocationAlias>> {
  return safeRequest(() => api.post('/location-aliases', toSnake(data)))
}

export function promoteAlias(aliasId: number): Promise<ApiResponse<Location>> {
  return safeRequest(() => api.post(`/location-aliases/${aliasId}/promote`))
}

export function deleteAlias(aliasId: number): Promise<ApiResponse<{ success: boolean }>> {
  return safeRequest(() => api.delete(`/location-aliases/${aliasId}`), () => ({ success: true }))
}

export function mergeLocations(data: { sourceLocationId: number; targetLocationId: number }): Promise<ApiResponse<Location>> {
  return safeRequest(() => api.post('/locations/merge', toSnake(data)))
}

export function previewLocationImport(file: File): Promise<ApiResponse<{
  filename: string
  sheetName: string
  rows: Array<{ name: string; row: number; column: number }>
  totalCount: number
  duplicateNames: string[]
  alreadyExist: string[]
  newNames: string[]
}>> {
  return safeRequest(() => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/locations/import/preview', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }, (res) => toCamel(res.data))
}

export function commitLocationImport(names: string[]): Promise<ApiResponse<{
  created: number
  skippedExisting: number
  errors: string[]
}>> {
  return safeRequest(() => api.post('/locations/import/commit', { names }), (res) => toCamel(res.data))
}
