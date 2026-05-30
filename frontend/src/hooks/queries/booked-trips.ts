import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys, invalidateBookedTripDeps } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useBookedTrips(filters?: { clientId?: number; driverId?: number; matched?: boolean; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }) {
  const flatFilters: Record<string, string> = {}
  if (filters?.clientId) flatFilters.clientId = String(filters.clientId)
  if (filters?.driverId) flatFilters.driverId = String(filters.driverId)
  if (filters?.matched !== undefined) flatFilters.matched = String(filters.matched)
  if (filters?.dateFrom) flatFilters.dateFrom = filters.dateFrom
  if (filters?.dateTo) flatFilters.dateTo = filters.dateTo
  if (filters?.page) flatFilters.page = String(filters.page)
  if (filters?.pageSize) flatFilters.pageSize = String(filters.pageSize)

  return useQuery({
    queryKey: queryKeys.bookedTripsFiltered(Object.keys(flatFilters).length > 0 ? flatFilters : undefined),
    queryFn: async () => {
      const res = await apiClient.getBookedTrips(filters)
      if (!res.success) {
        return { items: [] as BookedTrip[], total: 0, page: 1, pageSize: 50, totalPages: 0 } as PaginatedResult<BookedTrip>
      }
      return res.data
    },
  })
}


export function useBookedTrip(id: number | null) {
  return useQuery({
    queryKey: id ? queryKeys.bookedTrip(id) : ['booked-trips', 'none'],
    queryFn: async () => {
      if (!id) return null
      const res = await apiClient.getBookedTrip(id)
      return res.success ? res.data : null
    },
    enabled: !!id,
  })
}


export function useCreateBookedTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BookedTripCreatePayload) => apiClient.createBookedTrip(data).then(unwrap),
    onSuccess: () => { invalidateBookedTripDeps(qc) },
  })
}


export function useUpdateBookedTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BookedTripUpdatePayload }) => apiClient.updateBookedTrip(id, data).then(unwrap),
    onSuccess: () => {
      invalidateBookedTripDeps(qc)
      qc.invalidateQueries({ queryKey: ['suggest-matches'] })
      qc.invalidateQueries({ queryKey: ['suggest-wos'] })
    },
  })
}
