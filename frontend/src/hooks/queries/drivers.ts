import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys, invalidateDriverDeps } from '../query-keys'
import type { ApiResponse, Driver } from '@/data/domain'
import type { DriverFilters } from '@/services/api/drivers.api'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useDrivers() {
  return useQuery({
    queryKey: queryKeys.drivers,
    queryFn: async () => {
      const res = await apiClient.getDrivers()
      return res.success ? res.data : []
    },
  })
}

export function useDriversPaged(filters?: DriverFilters) {
  const key = ['drivers-paged', filters?.search ?? '', filters?.sortBy ?? '', filters?.sortOrder ?? 'asc', filters?.page ?? 1, filters?.pageSize ?? 50]
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await apiClient.getDriversPaged(filters)
      if (!res.success) return { items: [] as Driver[], total: 0, page: 1, pageSize: 50, totalPages: 0 }
      return res.data
    },
  })
}


export function useCreateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { username: string; fullName?: string; phone: string; password?: string; plate?: string }) =>
      apiClient.createDriver(data).then(unwrap),
    onSuccess: () => { invalidateDriverDeps(qc) },
  })
}


export function useUpdateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ fullName: string; phone: string; username: string }> }) =>
      apiClient.updateDriver(id, data).then(unwrap),
    onSuccess: () => { invalidateDriverDeps(qc) },
  })
}


export function useDeleteDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteDriver(id).then(unwrap),
    onSuccess: () => {
      invalidateDriverDeps(qc)
      qc.invalidateQueries({ queryKey: ['vehicles'] }) // prefix match for all vehicle queries
    },
  })
}

