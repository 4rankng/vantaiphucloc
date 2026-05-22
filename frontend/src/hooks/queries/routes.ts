import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useRoutes() {
  return useQuery({
    queryKey: queryKeys.routes,
    queryFn: async () => {
      const res = await apiClient.getRoutes()
      return res.success ? res.data : []
    },
  })
}


export function useCreateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RouteCreatePayload) => apiClient.createRoute(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.routes }) },
  })
}


export function useUpdateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: RouteUpdatePayload }) => apiClient.updateRoute(id, data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.routes }) },
  })
}


export function useDeleteRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => apiClient.deleteRoute(id).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.routes }) },
  })
}

