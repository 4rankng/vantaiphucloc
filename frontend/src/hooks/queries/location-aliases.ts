import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys, invalidateLocationDeps } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useLocationAliases(locationId?: number) {
  return useQuery({
    queryKey: queryKeys.locationAliasesFiltered(locationId),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.locationAliases })
      qc.invalidateQueries({ queryKey: queryKeys.locations })
    },
  })
}


export function usePromoteAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (aliasId: number) =>
      apiClient.confirmAlias(aliasId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.locationAliases })
      qc.invalidateQueries({ queryKey: queryKeys.pendingReviewLocations })
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.locationAliases })
      qc.invalidateQueries({ queryKey: queryKeys.locations })
      qc.invalidateQueries({ queryKey: queryKeys.pendingReviewLocations })
    },
  })
}


export function useMergeLocations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sourceLocationId, targetLocationId }: { sourceLocationId: number; targetLocationId: number }) =>
      apiClient.mergeLocations(sourceLocationId, targetLocationId).then(unwrap),
    onSuccess: () => {
      invalidateLocationDeps(qc)
      qc.invalidateQueries({ queryKey: queryKeys.pendingReviewLocations })
    },
  })
}


export function usePendingReviewLocations() {
  return useQuery({
    queryKey: queryKeys.pendingReviewLocations,
    queryFn: async () => {
      const res = await apiClient.getPendingReviewLocations()
      return res.success ? res.data : []
    },
  })
}

