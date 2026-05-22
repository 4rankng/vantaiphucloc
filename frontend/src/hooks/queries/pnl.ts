import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useMonthlyPnL(startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.monthlyPnL(startDate, endDate),
    queryFn: async () => {
      const res = await apiClient.getMonthlyPnL(startDate, endDate)
      return res.success ? res.data : null
    },
    enabled: !!startDate && !!endDate,
  })
}


export function useVehiclePnL(dateFrom: string, dateTo: string, vehicleId?: number) {
  return useQuery({
    queryKey: ['vehicle-pnl', dateFrom, dateTo, vehicleId],
    queryFn: async () => {
      const res = await apiClient.getVehiclePnL(dateFrom, dateTo, vehicleId)
      return res.success ? res.data : null
    },
    enabled: !!dateFrom && !!dateTo,
  })
}


export function useTripDailyStats(dateFrom: string, dateTo: string, clientId?: number) {
  return useQuery({
    queryKey: ['trip-daily-stats', dateFrom, dateTo, clientId],
    queryFn: async () => {
      const res = await apiClient.getTripDailyStats(dateFrom, dateTo, clientId)
      return res.success ? res.data : null
    },
    enabled: !!dateFrom && !!dateTo,
  })
}

