import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse, Client } from '@/data/domain'
import type { ClientFilters } from '@/services/api/clients.api'

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

export function useClientsPaged(filters?: ClientFilters) {
  const key = ['clients-paged', filters?.search ?? '', filters?.sortBy ?? '', filters?.sortOrder ?? 'asc', filters?.page ?? 1, filters?.pageSize ?? 50]
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await apiClient.getClientsPaged(filters)
      if (!res.success) return { items: [] as Client[], total: 0, page: 1, pageSize: 50, totalPages: 0 }
      return res.data
    },
  })
}


export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Client, 'id'>) => apiClient.createClient(data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
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
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}

