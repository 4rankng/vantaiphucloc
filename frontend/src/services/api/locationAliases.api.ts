import { api } from './client'
import { toCamel, toSnake, ok, fail } from './utils'
import type { LocationAlias, MergeLocationsResponse, ApiResponse } from '@/data/domain'

export async function listAliases(
  params?: { status?: string; locationId?: number },
): Promise<ApiResponse<LocationAlias[]>> {
  try {
    const res = await api.get('/location-aliases', { params: toSnake(params) })
    return ok(toCamel<LocationAlias[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function createAlias(
  locationId: number,
  alias: string,
): Promise<ApiResponse<LocationAlias>> {
  try {
    const res = await api.post('/location-aliases', { location_id: locationId, alias })
    return ok(toCamel<LocationAlias>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function confirmAlias(
  aliasId: number,
): Promise<ApiResponse<LocationAlias>> {
  try {
    const res = await api.post(`/location-aliases/${aliasId}/confirm`)
    return ok(toCamel<LocationAlias>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function rejectAlias(
  aliasId: number,
  note?: string,
): Promise<ApiResponse<LocationAlias>> {
  try {
    const res = await api.post(`/location-aliases/${aliasId}/reject`, { note })
    return ok(toCamel<LocationAlias>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function reopenAlias(
  aliasId: number,
): Promise<ApiResponse<LocationAlias>> {
  try {
    const res = await api.post(`/location-aliases/${aliasId}/reopen`)
    return ok(toCamel<LocationAlias>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function mergeLocations(
  sourceLocationId: number,
  targetLocationId: number,
): Promise<ApiResponse<MergeLocationsResponse>> {
  try {
    const res = await api.post('/location-aliases/merge-locations', {
      source_location_id: sourceLocationId,
      target_location_id: targetLocationId,
    })
    return ok(toCamel<MergeLocationsResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getPendingReviewLocations(): Promise<ApiResponse<
  { location: { id: number; name: string }; pendingAliases: LocationAlias[] }[]
>> {
  try {
    const res = await api.get('/locations/pending-review')
    return ok(toCamel(res.data))
  } catch (err) {
    return fail(err)
  }
}
