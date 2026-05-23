import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'

export function useDashboardSummary(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-summary', dateFrom, dateTo],
    queryFn: async () => {
      const res = await apiClient.getDashboardSummary(dateFrom, dateTo)
      return res.success ? res.data : null
    },
  })
}


export function useKpiTrends(days = 12, endDate?: string) {
  return useQuery({
    queryKey: ['kpi-trends', days, endDate],
    queryFn: async () => {
      const res = await apiClient.getKpiTrends(days, endDate)
      return res.success ? res.data : null
    },
    // KPI trends are activity stats; 1-minute stale time is plenty.
    staleTime: 60_000,
  })
}

