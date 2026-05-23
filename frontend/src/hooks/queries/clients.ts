import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse, Client, PaginatedResult } from '@/data/domain'
import type { ClientFilters, ClientSortBy, SortOrder } from '@/services/api/clients.api'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients,
    queryFn: async () => {
      const res = await apiClient.getClients()
      return res.success ? res.data : []
    },
  })
}

const PAGE_SIZE = 50

export function useClientsInfinite(filters?: {
  search?: string
  sortBy?: ClientSortBy
  sortOrder?: SortOrder
}) {
  return useInfiniteQuery<PaginatedResult<Client>, Error>({
    queryKey: ['clients-infinite', filters?.search ?? '', filters?.sortBy ?? '', filters?.sortOrder ?? 'asc'],
    queryFn: async ({ pageParam }) => {
      const res = await apiClient.getClientsPaged({
        search: filters?.search || undefined,
        sortBy: filters?.sortBy,
        sortOrder: filters?.sortOrder,
        page: pageParam as number,
        pageSize: PAGE_SIZE,
      })
      return unwrap(res)
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  })
}


export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Client, 'id'>) => apiClient.createClient(data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['clients-infinite'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}


export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Client> }) => apiClient.updateClient(id, data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['clients-infinite'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}


export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteClient(id).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['clients-infinite'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}
