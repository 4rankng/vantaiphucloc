import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'

export function useOcrStats(days = 30) {
  return useQuery({
    queryKey: queryKeys.ocrStats(days),
    queryFn: async () => {
      const res = await apiClient.getOcrStats(days)
      return res.success ? res.data : null
    },
    // Admin analytics; a 60-second stale window is plenty.
    staleTime: 60_000,
  })
}
