import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useLocationAliases(locationId?: number) {
  return useQuery({
    queryKey: ['location-aliases', locationId ?? 'all'],
    queryFn: async () => {
      const res = await apiClient.listAliases(locationId ? { locationId } : undefined)
      return res.success ? res.data : []
    },
  })
}


export function useCreateAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ locationId, alias }: { locationId: number; alias: string }) =>
      apiClient.createAlias(locationId, alias).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['location-aliases'] }) },
  })
}


export function usePromoteAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (aliasId: number) =>
      apiClient.confirmAlias(aliasId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location-aliases'] })
      qc.invalidateQueries({ queryKey: queryKeys.locations })
    },
  })
}


export function useDeleteAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (aliasId: number) => {
      const res = await apiClient.rejectAlias(aliasId)
      return unwrap(res)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['location-aliases'] }) },
  })
}


export function useMergeLocations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sourceLocationId, targetLocationId }: { sourceLocationId: number; targetLocationId: number }) =>
      apiClient.mergeLocations(sourceLocationId, targetLocationId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      qc.invalidateQueries({ queryKey: ['location-aliases'] })
      qc.invalidateQueries({ queryKey: ['routes'] })
      qc.invalidateQueries({ queryKey: ['pricings'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
    },
  })
}


export function usePendingReviewLocations() {
  return useQuery({
    queryKey: ['pending-review-locations'],
    queryFn: async () => {
      const res = await apiClient.getPendingReviewLocations()
      return res.success ? res.data : []
    },
  })
}

