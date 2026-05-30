import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys, invalidateVehicleExpenseDeps } from '../query-keys'
import type { ApiResponse } from '@/data/domain'
import type { VehicleExpenseCategory, VehicleExpensePage } from '@/services/api/vehicleExpenses.api'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useVehicleExpenses(params?: {
  vehicleId?: number
  category?: VehicleExpenseCategory
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: queryKeys.vehicleExpenses(params),
    queryFn: async () => {
      const res = await apiClient.listVehicleExpenses(params)
      return res.success ? res.data : null
    },
  })
}


export function useVehicleExpensesInfinite(params?: {
  vehicleId?: number
  category?: VehicleExpenseCategory
  dateFrom?: string
  dateTo?: string
  pageSize?: number
}) {
  return useInfiniteQuery<VehicleExpensePage, Error>({
    queryKey: ['vehicle-expenses-infinite', params?.vehicleId ?? '', params?.category ?? '', params?.dateFrom ?? '', params?.dateTo ?? ''],
    queryFn: async ({ pageParam }) => {
      const res = await apiClient.listVehicleExpenses({
        ...params,
        page: pageParam as number,
        pageSize: params?.pageSize ?? 30,
      })
      if (!res.success) throw new Error(res.message ?? 'Lỗi hệ thống')
      return res.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  })
}

export function useCreateVehicleExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof apiClient.createVehicleExpense>[0]) =>
      apiClient.createVehicleExpense(payload).then(unwrap),
    onSuccess: () => { invalidateVehicleExpenseDeps(qc) },
  })
}


export function useUpdateVehicleExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof apiClient.updateVehicleExpense>[1] }) =>
      apiClient.updateVehicleExpense(id, payload).then(unwrap),
    onSuccess: () => { invalidateVehicleExpenseDeps(qc) },
  })
}


export function useDeleteVehicleExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.deleteVehicleExpense(id).then(unwrap),
    onSuccess: () => { invalidateVehicleExpenseDeps(qc) },
  })
}

