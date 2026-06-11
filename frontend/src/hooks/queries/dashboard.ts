import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'

export function useDashboardSummary(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: queryKeys.dashboardSummary(dateFrom, dateTo),
    queryFn: async () => {
      const res = await apiClient.getDashboardSummary(dateFrom, dateTo)
      return res.success ? res.data : null
    },
  })
}


export function useKpiTrends(days = 12, endDate?: string) {
  return useQuery({
    queryKey: queryKeys.kpiTrends(days, endDate),
    queryFn: async () => {
      const res = await apiClient.getKpiTrends(days, endDate)
      return res.success ? res.data : null
    },
    // KPI trends are activity stats; 1-minute stale time is plenty.
    staleTime: 60_000,
  })
}

