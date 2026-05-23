import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const res = await apiClient.getNotifications()
      return res.success ? res.data : []
    },
  })
}

