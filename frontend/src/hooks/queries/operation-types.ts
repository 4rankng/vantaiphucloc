import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys, invalidateOperationTypeDeps } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useOperationTypes() {
  return useQuery({
    queryKey: queryKeys.operationTypes,
    queryFn: async () => {
      const res = await apiClient.getOperationTypes()
      return res.success ? res.data : []
    },
    staleTime: 5 * 60 * 1000, // 5 min — this data rarely changes
  })
}

export function useCreateOperationType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; label: string }) =>
      apiClient.createOperationType(data).then(unwrap),
    onSuccess: () => { invalidateOperationTypeDeps(qc) },
  })
}

export function useUpdateOperationType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; label?: string; isActive?: boolean } }) =>
      apiClient.updateOperationType(id, data).then(unwrap),
    onSuccess: () => { invalidateOperationTypeDeps(qc) },
  })
}

export function useDeleteOperationType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.deleteOperationType(id).then(unwrap),
    onSuccess: () => { invalidateOperationTypeDeps(qc) },
  })
}
