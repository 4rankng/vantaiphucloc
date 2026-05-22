import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useDeliveredTrips(filters?: { clientId?: number; driverId?: number; dateFrom?: string; dateTo?: string; status?: DeliveredTrip['status']; search?: string; page?: number; pageSize?: number; sortBy?: import('@/services/api/deliveredTrips.api').DeliveredTripSortBy; sortOrder?: import('@/services/api/deliveredTrips.api').SortOrder }) {
  const flatFilters: Record<string, string> = {}
  if (filters?.clientId) flatFilters.clientId = String(filters.clientId)
  if (filters?.driverId) flatFilters.driverId = String(filters.driverId)
  if (filters?.dateFrom) flatFilters.dateFrom = filters.dateFrom
  if (filters?.dateTo) flatFilters.dateTo = filters.dateTo
  if (filters?.status) flatFilters.status = filters.status
  if (filters?.search) flatFilters.search = filters.search
  if (filters?.page) flatFilters.page = String(filters.page)
  if (filters?.pageSize) flatFilters.pageSize = String(filters.pageSize)
  if (filters?.sortBy) flatFilters.sortBy = filters.sortBy
  if (filters?.sortOrder) flatFilters.sortOrder = filters.sortOrder

  return useQuery({
    queryKey: queryKeys.deliveredTripsFiltered(Object.keys(flatFilters).length > 0 ? flatFilters : undefined),
    queryFn: async () => {
      const res = await apiClient.getDeliveredTrips(filters)
      if (!res.success) {
        return { items: [] as DeliveredTrip[], total: 0, page: 1, pageSize: 50, totalPages: 0 } as PaginatedResult<DeliveredTrip>
      }
      return res.data
    },
  })
}


export function useDeliveredTrip(id: number) {
  return useQuery({
    queryKey: queryKeys.deliveredTrip(id),
    queryFn: async () => {
      const res = await apiClient.getDeliveredTrip(id)
      return res.success ? res.data : null
    },
    enabled: !!id,
  })
}


export function useCreateDeliveredTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.createDeliveredTrip>[0]) => apiClient.createDeliveredTrip(data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}


export function useUpdateDeliveredTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DeliveredTripUpdatePayload }) => apiClient.updateDeliveredTrip(id, data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['suggest-matches'] })
      qc.invalidateQueries({ queryKey: ['suggest-wos'] })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}


export function useExportDeliveredTripsExcel() {
  return useMutation({
    mutationFn: (filters?: { dateFrom?: string; dateTo?: string; status?: string }) =>
      apiClient.exportDeliveredTripsExcel(filters),
  })
}

