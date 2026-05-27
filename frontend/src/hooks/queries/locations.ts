import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useLocations() {
  return useQuery({
    queryKey: queryKeys.locations,
    queryFn: async () => {
      const res = await apiClient.getLocations()
      return res.success ? res.data : []
    },
  })
}


export function useCreateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) => apiClient.createLocation(data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      qc.invalidateQueries({ queryKey: ['location-aliases'] })
      qc.invalidateQueries({ queryKey: ['routes'] })
      qc.invalidateQueries({ queryKey: ['pricings'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips-infinite'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
    },
  })
}


export function useUpdateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string } }) => apiClient.updateLocation(id, data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      qc.invalidateQueries({ queryKey: ['location-aliases'] })
      qc.invalidateQueries({ queryKey: ['routes'] })
      qc.invalidateQueries({ queryKey: ['pricings'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips-infinite'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
    },
  })
}


export function useDeleteLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteLocation(id).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      qc.invalidateQueries({ queryKey: ['location-aliases'] })
      qc.invalidateQueries({ queryKey: ['routes'] })
      qc.invalidateQueries({ queryKey: ['pricings'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips-infinite'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
    },
  })
}

export function useLocationAliases() {
  return useQuery({
    queryKey: ['location-aliases'],
    queryFn: async () => {
      const res = await apiClient.getLocationAliases()
      return res.success ? res.data : []
    },
  })
}

export function useCreateAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { locationId: number; alias: string }) => apiClient.createAlias(data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location-aliases'] })
      qc.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function usePromoteAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (aliasId: number) => apiClient.promoteAlias(aliasId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location-aliases'] })
      qc.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function useDeleteAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (aliasId: number) => apiClient.deleteAlias(aliasId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location-aliases'] })
      qc.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function useMergeLocations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { sourceLocationId: number; targetLocationId: number }) =>
      apiClient.mergeLocations(data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      qc.invalidateQueries({ queryKey: ['location-aliases'] })
      qc.invalidateQueries({ queryKey: ['routes'] })
      qc.invalidateQueries({ queryKey: ['pricings'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips-infinite'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
    },
  })
}

export function usePreviewLocationImport() {
  return useMutation({
    mutationFn: (file: File) => apiClient.previewLocationImport(file).then(unwrap),
  })
}

export function useCommitLocationImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (names: string[]) => apiClient.commitLocationImport(names).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      qc.invalidateQueries({ queryKey: ['location-aliases'] })
    },
  })
}

