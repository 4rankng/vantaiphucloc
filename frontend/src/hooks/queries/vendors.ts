import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] })
      qc.invalidateQueries({ queryKey: ['vendor-summary'] })
      qc.invalidateQueries({ queryKey: ['vendor-recon-imports'] })
    },
  })
}


export function useUpdateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Vendor> }) => apiClient.updateVendor(id, data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] })
      qc.invalidateQueries({ queryKey: ['vendor-summary'] })
      qc.invalidateQueries({ queryKey: ['vendor-recon-imports'] })
    },
  })
}


export function useDeleteVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteVendor(id).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] })
      qc.invalidateQueries({ queryKey: ['vendor-summary'] })
      qc.invalidateQueries({ queryKey: ['vendor-recon-imports'] })
    },
  })
}


export function useVendorSummary(vendorId: number | null, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: [...queryKeys.vendorSummary(vendorId ?? 0), dateFrom, dateTo],
    queryFn: async () => {
      const res = await apiClient.getVendorSummary(vendorId!, { dateFrom, dateTo })
      return res.success ? res.data : null
    },
    enabled: !!vendorId,
  })
}

