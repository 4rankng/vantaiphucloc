import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys, invalidateVendorDeps } from '../query-keys'
import type { ApiResponse, Vendor } from '@/data/domain'
import type { VendorFilters } from '@/services/api/vendors.api'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useVendors() {
  return useQuery({
    queryKey: queryKeys.vendors,
    queryFn: async () => {
      const res = await apiClient.getVendors()
      return res.success ? res.data : []
    },
  })
}

export function useVendorsPaged(filters?: VendorFilters) {
  return useQuery({
    queryKey: ['vendors-paged', filters?.search ?? '', filters?.sortBy ?? '', filters?.sortOrder ?? 'asc', filters?.page ?? 1, filters?.pageSize ?? 100],
    queryFn: async () => {
      const res = await apiClient.getVendorsPaged(filters)
      if (!res.success) throw new Error(res.message ?? 'Lỗi hệ thống')
      return res.data
    },
  })
}


export function useCreateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Vendor, 'id'>) => apiClient.createVendor(data).then(unwrap),
    onSuccess: () => { invalidateVendorDeps(qc) },
  })
}


export function useUpdateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Vendor> }) => apiClient.updateVendor(id, data).then(unwrap),
    onSuccess: () => { invalidateVendorDeps(qc) },
  })
}


export function useDeleteVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteVendor(id).then(unwrap),
    onSuccess: () => { invalidateVendorDeps(qc) },
  })
}

