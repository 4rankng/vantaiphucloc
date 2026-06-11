import { api } from './client'
import { safeRequest, toCamel, toSnake } from '@/lib/safe-request'
import type { LocationAlias, MergeLocationsResponse, ApiResponse } from '@/data/domain'

export function listAliases(
  params?: { status?: string; locationId?: number },
): Promise<ApiResponse<LocationAlias[]>> {
  return safeRequest(() => api.get('/location-aliases', { params: toSnake(params) }))
}

export function createAlias(
  locationId: number,
  alias: string,
): Promise<ApiResponse<LocationAlias>> {
  return safeRequest(() => api.post('/location-aliases', { location_id: locationId, alias }))
}

export function confirmAlias(aliasId: number): Promise<ApiResponse<LocationAlias>> {
  return safeRequest(() => api.post(`/location-aliases/${aliasId}/confirm`))
}

export function rejectAlias(aliasId: number, note?: string): Promise<ApiResponse<LocationAlias>> {
  return safeRequest(() => api.post(`/location-aliases/${aliasId}/reject`, { note }))
}

export function reopenAlias(aliasId: number): Promise<ApiResponse<LocationAlias>> {
  return safeRequest(() => api.post(`/location-aliases/${aliasId}/reopen`))
}

export function mergeLocations(
  sourceLocationId: number,
  targetLocationId: number,
): Promise<ApiResponse<MergeLocationsResponse>> {
  return safeRequest(() => api.post('/location-aliases/merge-locations', {
    source_location_id: sourceLocationId,
    target_location_id: targetLocationId,
  }))
}

export function getPendingReviewLocations(): Promise<ApiResponse<
  { location: { id: number; name: string }; pendingAliases: LocationAlias[] }[]
>> {
  return safeRequest(() => api.get('/locations/pending-review'))
}
