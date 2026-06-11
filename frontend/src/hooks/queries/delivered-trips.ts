import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys, invalidateDeliveredTripDeps } from '../query-keys'
import type { ApiResponse, DeliveredTrip, PaginatedResult, ContTypeStats } from '@/data/domain'
import type { DeliveredTripSortBy, SortOrder } from '@/services/api/deliveredTrips.api'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

const PAGE_SIZE = 10

export function useDeliveredTripsInfinite(filters?: {
  clientId?: number; driverId?: number; vendorId?: number
  dateFrom?: string; dateTo?: string; matched?: boolean; search?: string
  sortBy?: DeliveredTripSortBy; sortOrder?: SortOrder
}) {
  return useInfiniteQuery<PaginatedResult<DeliveredTrip>, Error>({
    queryKey: [
      queryKeys.deliveredTripsInfinite[0],
      filters?.clientId ?? '', filters?.driverId ?? '', filters?.vendorId ?? '',
      filters?.dateFrom ?? '', filters?.dateTo ?? '',
      String(filters?.matched ?? ''), filters?.search ?? '',
      filters?.sortBy ?? '', filters?.sortOrder ?? '',
    ],
    queryFn: async ({ pageParam }) => {
      const res = await apiClient.getDeliveredTrips({ ...filters, page: pageParam as number, pageSize: PAGE_SIZE })
      if (res.success) return res.data
      return { items: [], total: 0, page: pageParam as number, pageSize: PAGE_SIZE, totalPages: 0 }
    },
    refetchOnMount: 'always',
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  })
}


export function useDeliveredTrips(filters?: { clientId?: number; driverId?: number; vendorId?: number; dateFrom?: string; dateTo?: string; matched?: boolean; search?: string; page?: number; pageSize?: number; sortBy?: DeliveredTripSortBy; sortOrder?: SortOrder }) {
  const flatFilters: Record<string, string> = {}
  if (filters?.clientId) flatFilters.clientId = String(filters.clientId)
  if (filters?.driverId) flatFilters.driverId = String(filters.driverId)
  if (filters?.vendorId) flatFilters.vendorId = String(filters.vendorId)
  if (filters?.dateFrom) flatFilters.dateFrom = filters.dateFrom
  if (filters?.dateTo) flatFilters.dateTo = filters.dateTo
  if (filters?.matched !== undefined) flatFilters.matched = String(filters.matched)
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
    gcTime: 0,
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
    refetchOnMount: 'always',
  })
}


export function useCreateDeliveredTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.createDeliveredTrip>[0]) => apiClient.createDeliveredTrip(data).then(unwrap),
    onSuccess: () => invalidateDeliveredTripDeps(qc),
  })
}


export function useUpdateDeliveredTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DeliveredTripUpdatePayload }) => apiClient.updateDeliveredTrip(id, data).then(unwrap),
    onSuccess: () => {
      invalidateDeliveredTripDeps(qc)
      qc.invalidateQueries({ queryKey: queryKeys.suggestMatches })
      qc.invalidateQueries({ queryKey: queryKeys.suggestWos })
    },
  })
}


export function useDeleteDeliveredTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteDeliveredTrip(id),
    onSuccess: () => invalidateDeliveredTripDeps(qc),
  })
}


export function useExportDeliveredTripsExcel() {
  return useMutation({
    mutationFn: (filters?: { dateFrom?: string; dateTo?: string; status?: string }) =>
      apiClient.exportDeliveredTripsExcel(filters),
  })
}


const EMPTY_STATS: ContTypeStats = { E20: 0, F20: 0, E40: 0, F40: 0 }

export function useContTypeStats(filters?: { driverId?: number; dateFrom?: string; dateTo?: string }) {
  return useQuery<ContTypeStats>({
    queryKey: queryKeys.contTypeStats(filters?.driverId, filters?.dateFrom, filters?.dateTo),
    queryFn: async () => {
      const res = await apiClient.getContTypeStats(filters)
      return res.success ? res.data : EMPTY_STATS
    },
    enabled: filters?.driverId != null,
  })
}

