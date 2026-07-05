import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'

export function useOcrStats(days = 30, includeHourly = false) {
  return useQuery({
    queryKey: queryKeys.ocrStats(days, includeHourly),
    queryFn: async () => {
      const res = await apiClient.getOcrStats(days, includeHourly)
      return res.success ? res.data : null
    },
    // Admin analytics; a 60-second stale window is plenty.
    staleTime: 60_000,
  })
}

export function useOcrFailures(days = 30, enabled = true) {
  return useQuery({
    queryKey: queryKeys.ocrFailures(days),
    queryFn: async () => {
      const res = await apiClient.getOcrFailures(days)
      return res.success ? res.data.items : []
    },
    staleTime: 60_000,
    enabled,
  })
}
