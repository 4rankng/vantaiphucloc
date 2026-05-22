import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

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


export function useCreateVehicleExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof apiClient.createVehicleExpense>[0]) =>
      apiClient.createVehicleExpense(payload).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-expenses'] })
      qc.invalidateQueries({ queryKey: ['vehicle-pnl'] })
      qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })
}


export function useUpdateVehicleExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof apiClient.updateVehicleExpense>[1] }) =>
      apiClient.updateVehicleExpense(id, payload).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-expenses'] })
      qc.invalidateQueries({ queryKey: ['vehicle-pnl'] })
      qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })
}


export function useDeleteVehicleExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.deleteVehicleExpense(id).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-expenses'] })
      qc.invalidateQueries({ queryKey: ['vehicle-pnl'] })
      qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })
}

