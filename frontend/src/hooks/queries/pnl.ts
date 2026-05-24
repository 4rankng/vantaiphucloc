import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { getDirectorDashboard } from '@/services/api/pnl.api'
import { queryKeys } from '../query-keys'

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


export function useDirectorDashboard(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['director-dashboard', dateFrom, dateTo],
    queryFn: async () => {
      const res = await getDirectorDashboard(dateFrom, dateTo)
      return res.success ? res.data : null
    },
    enabled: !!dateFrom && !!dateTo,
  })
}

